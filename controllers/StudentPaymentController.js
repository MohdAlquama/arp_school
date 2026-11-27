import Student from '../models/Student.js';
import StudentPayment from '../models/StudentPayment.js';
import CashfreeGateway from '../services/CashfreeGateway.js';

function parseAmount(value) {
    const amount = String(value || '').trim();
    if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) return null;
    return Number(amount).toFixed(2);
}

function redirectWithMessage(res, studentId, type, message) {
    return res.redirect(`/students/${studentId}?${type}=${encodeURIComponent(message)}`);
}

export default class StudentPaymentController {
    static detail = async (req, res) => {
        const id = Number(req.params.id);
        const student = Number.isSafeInteger(id) && id > 0 ? await Student.findById(id) : null;
        if (!student) return res.status(404).send('Student not found.');
        const [installments, payments] = await Promise.all([
            StudentPayment.installmentsForStudent(id),
            StudentPayment.paymentsForStudent(id)
        ]);
        const paidTotal = payments.reduce((sum, payment) => sum + (payment.status === 'PAID' ? Number(payment.amount) : 0), 0);
        const plannedTotal = installments.reduce((sum, installment) => sum + installment.amount, 0);
        return res.render('students/payments', {
            title: 'Student Fees', page: 'students', student, installments, payments,
            paidTotal, plannedTotal, remainingTotal: Math.max(0, Number(student.total_fee) - paidTotal),
            error: req.query.error || null, success: req.query.success || null
        });
    };

    static addInstallment = async (req, res) => {
        const studentId = Number(req.params.id);
        const student = Number.isSafeInteger(studentId) && studentId > 0 ? await Student.findById(studentId) : null;
        if (!student) return res.status(404).send('Student not found.');
        const amount = parseAmount(req.body.amount);
        const title = String(req.body.title || '').trim();
        const dueDate = String(req.body.due_date || '').trim();
        if (!amount || !title || title.length > 120 || (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate))) {
            return redirectWithMessage(res, studentId, 'error', 'Enter an installment name, a positive amount, and a valid due date.');
        }
        try {
            await StudentPayment.createInstallment(studentId, { title, amount, dueDate });
            return redirectWithMessage(res, studentId, 'success', 'Installment added.');
        } catch (error) {
            return redirectWithMessage(res, studentId, 'error', error.message);
        }
    };

    static recordCash = async (req, res) => {
        const installmentId = Number(req.params.installmentId);
        const amount = parseAmount(req.body.amount);
        const installment = Number.isSafeInteger(installmentId) && installmentId > 0
            ? (await StudentPayment.installmentsForStudent(Number(req.body.student_id))).find(item => Number(item.id) === installmentId)
            : null;
        if (!installment || !amount) return res.status(400).send('Invalid installment or amount.');
        const studentId = Number(req.body.student_id);
        try {
            await StudentPayment.recordCash(installmentId, amount, String(req.body.reference_number || '').trim().slice(0, 120));
            return redirectWithMessage(res, studentId, 'success', 'Cash payment recorded.');
        } catch (error) {
            return redirectWithMessage(res, studentId, 'error', error.message);
        }
    };

    static createCashfreeLink = async (req, res) => {
        const installmentId = Number(req.params.installmentId);
        const studentId = Number(req.body.student_id);
        const amount = parseAmount(req.body.amount);
        const installment = Number.isSafeInteger(studentId) && studentId > 0
            ? (await StudentPayment.installmentsForStudent(studentId)).find(item => Number(item.id) === installmentId)
            : null;
        if (!installment || !amount) return res.status(400).send('Invalid installment or amount.');
        const student = await Student.findById(studentId);
        let paymentId;
        try {
            paymentId = await StudentPayment.reserveCashfree(installmentId, amount);
            const linkId = `fee_${paymentId}_${Date.now()}`;
            const link = await CashfreeGateway.createPaymentLink({
                linkId,
                amount,
                purpose: `${student.student_name} - ${installment.title}`,
                student,
                installmentId,
                paymentId
            });
            await StudentPayment.attachCashfreeLink(paymentId, linkId, link.link_url);
            return redirectWithMessage(res, studentId, 'success', 'Cashfree payment link and QR are ready.');
        } catch (error) {
            if (paymentId) await StudentPayment.failCashfreePayment(paymentId);
            return redirectWithMessage(res, studentId, 'error', error.message);
        }
    };

    static cashfreeWebhook = async (req, res) => {
        const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
        const signature = req.get('x-webhook-signature');
        const timestamp = req.get('x-webhook-timestamp');
        if (!(await CashfreeGateway.verifyWebhook(rawBody, signature, timestamp))) return res.sendStatus(401);

        let event;
        try { event = JSON.parse(rawBody.toString('utf8')); }
        catch { return res.sendStatus(400); }
        const linkId = event?.data?.link_id || event?.data?.link_details?.link_id || event?.link_id;
        if (!linkId) return res.sendStatus(200);

        const payment = await StudentPayment.findByCashfreeLinkId(String(linkId));
        if (!payment || payment.status !== 'PENDING') return res.sendStatus(200);

        const link = await CashfreeGateway.fetchPaymentLink(String(linkId));
        if (Math.round(Number(link.link_amount_paid || 0) * 100) >= Math.round(Number(payment.amount) * 100)) {
            await StudentPayment.markCashfreePaid(payment.id);
        }
        return res.sendStatus(200);
    };
}
