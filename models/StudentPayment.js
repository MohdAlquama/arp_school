import db from '../config/database.js';

function cents(value) { return Math.round(Number(value) * 100); }

export default class StudentPayment {
    static async studentForInstallment(installmentId) {
        const [rows] = await db.execute(`
            SELECT s.* FROM students s
            JOIN student_installments i ON i.student_id = s.id
            WHERE i.id = ? LIMIT 1
        `, [installmentId]);
        return rows[0] || null;
    }

    static async installmentsForStudent(studentId) {
        const [rows] = await db.execute(`
            SELECT i.id, i.student_id, i.installment_no, i.title, i.amount, i.due_date,
                   COALESCE(SUM(CASE WHEN p.status = 'PAID' THEN p.amount ELSE 0 END), 0) AS paid_amount,
                   COALESCE(SUM(CASE WHEN p.status = 'PENDING' THEN p.amount ELSE 0 END), 0) AS pending_amount
            FROM student_installments i
            LEFT JOIN student_payments p ON p.installment_id = i.id
            WHERE i.student_id = ?
            GROUP BY i.id
            ORDER BY i.installment_no
        `, [studentId]);
        return rows.map(row => ({
            ...row,
            amount: Number(row.amount),
            paid_amount: Number(row.paid_amount),
            pending_amount: Number(row.pending_amount),
            balance: Math.max(0, Number(row.amount) - Number(row.paid_amount)),
            available: Math.max(0, Number(row.amount) - Number(row.paid_amount) - Number(row.pending_amount))
        }));
    }

    static async paymentsForStudent(studentId) {
        const [rows] = await db.execute(`
            SELECT p.id, p.installment_id, p.amount, p.payment_mode, p.status,
                   p.reference_number, p.cashfree_link_url, p.created_at, p.paid_at,
                   i.installment_no, i.title
            FROM student_payments p
            JOIN student_installments i ON i.id = p.installment_id
            WHERE i.student_id = ?
            ORDER BY p.id DESC
        `, [studentId]);
        return rows;
    }

    static async createInstallment(studentId, { title, amount, dueDate }) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const [students] = await connection.execute('SELECT total_fee FROM students WHERE id = ? FOR UPDATE', [studentId]);
            if (!students.length) throw new Error('Student not found.');
            const [totals] = await connection.execute('SELECT COALESCE(SUM(amount), 0) AS planned FROM student_installments WHERE student_id = ?', [studentId]);
            if (cents(totals[0].planned) + cents(amount) > cents(students[0].total_fee)) throw new Error('Installment amounts cannot exceed the student total fee.');
            const [numbers] = await connection.execute('SELECT COALESCE(MAX(installment_no), 0) + 1 AS next_no FROM student_installments WHERE student_id = ?', [studentId]);
            await connection.execute(
                'INSERT INTO student_installments (student_id, installment_no, title, amount, due_date) VALUES (?, ?, ?, ?, ?)',
                [studentId, numbers[0].next_no, title, amount, dueDate || null]
            );
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally { connection.release(); }
    }

    static async recordCash(installmentId, amount, referenceNumber) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const [installments] = await connection.execute('SELECT amount FROM student_installments WHERE id = ? FOR UPDATE', [installmentId]);
            if (!installments.length) throw new Error('Installment not found.');
            const [summaryRows] = await connection.execute(`
                SELECT COALESCE(SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END), 0) AS paid,
                       COALESCE(SUM(CASE WHEN status = 'PENDING' THEN amount ELSE 0 END), 0) AS pending
                FROM student_payments WHERE installment_id = ?
            `, [installmentId]);
            const remaining = cents(installments[0].amount) - cents(summaryRows[0].paid) - cents(summaryRows[0].pending);
            if (cents(amount) > remaining) throw new Error('Payment amount exceeds the remaining amount available for this installment.');
            await connection.execute(
                `INSERT INTO student_payments (installment_id, amount, payment_mode, status, reference_number, paid_at)
                 VALUES (?, ?, 'CASH', 'PAID', ?, CURRENT_TIMESTAMP)`,
                [installmentId, amount, referenceNumber || null]
            );
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally { connection.release(); }
    }

    static async reserveCashfree(installmentId, amount) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const [installments] = await connection.execute('SELECT amount FROM student_installments WHERE id = ? FOR UPDATE', [installmentId]);
            if (!installments.length) throw new Error('Installment not found.');
            const [summaryRows] = await connection.execute(`
                SELECT COALESCE(SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END), 0) AS paid,
                       COALESCE(SUM(CASE WHEN status = 'PENDING' THEN amount ELSE 0 END), 0) AS pending
                FROM student_payments WHERE installment_id = ?
            `, [installmentId]);
            const remaining = cents(installments[0].amount) - cents(summaryRows[0].paid) - cents(summaryRows[0].pending);
            if (cents(amount) > remaining) throw new Error('Payment amount exceeds the remaining amount available for this installment.');
            const [result] = await connection.execute(
                `INSERT INTO student_payments (installment_id, amount, payment_mode, status)
                 VALUES (?, ?, 'CASHFREE', 'PENDING')`, [installmentId, amount]
            );
            await connection.commit();
            return result.insertId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally { connection.release(); }
    }

    static async attachCashfreeLink(paymentId, linkId, linkUrl) {
        await db.execute('UPDATE student_payments SET cashfree_link_id = ?, cashfree_link_url = ? WHERE id = ?', [linkId, linkUrl, paymentId]);
    }

    static async failCashfreePayment(paymentId) {
        await db.execute("UPDATE student_payments SET status = 'FAILED' WHERE id = ? AND status = 'PENDING'", [paymentId]);
    }

    static async findByCashfreeLinkId(linkId) {
        const [rows] = await db.execute(`
            SELECT p.id, p.amount, p.status, p.installment_id
            FROM student_payments p WHERE p.cashfree_link_id = ? LIMIT 1
        `, [linkId]);
        return rows[0] || null;
    }

    static async markCashfreePaid(paymentId) {
        await db.execute("UPDATE student_payments SET status = 'PAID', paid_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'PENDING'", [paymentId]);
    }
}
