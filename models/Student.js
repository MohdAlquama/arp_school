import db from '../config/database.js';

const fields = `student_name, gender, father_name, mother_name, student_number, father_phone,
    alternate_phone, whatsapp_number, total_fee, category_id, subcategory_id, remarks, image_data, image_mime`;

export default class Student {
    static async list() {
        const [rows] = await db.execute(`
            SELECT s.id, s.student_name, s.gender, s.student_number, s.father_phone,
                   s.total_fee, s.image_mime, c.name AS category_name, sc.name AS subcategory_name
            FROM students s
            JOIN subcategories sc ON sc.id = s.subcategory_id
            JOIN categories c ON c.id = sc.category_id
            ORDER BY s.student_name, s.id DESC
        `);
        return rows;
    }

    static async findById(id) {
        const [rows] = await db.execute(`
            SELECT s.*, c.name AS category_name, sc.name AS subcategory_name
            FROM students s
            JOIN subcategories sc ON sc.id = s.subcategory_id
            JOIN categories c ON c.id = sc.category_id
            WHERE s.id = ? LIMIT 1
        `, [id]);
        return rows[0] || null;
    }

    static async imageById(id) {
        const [rows] = await db.execute('SELECT image_data, image_mime FROM students WHERE id = ? LIMIT 1', [id]);
        return rows[0] || null;
    }

    static async create(student) {
        const values = fields.split(',').map(field => student[field.trim()]);
        const placeholders = values.map(() => '?').join(', ');
        const [result] = await db.execute(`INSERT INTO students (${fields}) VALUES (${placeholders})`, values);
        return result.insertId;
    }

    static async update(id, student) {
        const updateFields = fields.split(',').map(field => field.trim()).filter(field => !['image_data', 'image_mime'].includes(field));
        const assignments = updateFields.map(field => `${field} = ?`);
        const values = updateFields.map(field => student[field]);
        if (student.imageAction === 'replace') {
            assignments.push('image_data = ?', 'image_mime = ?');
            values.push(student.image_data, student.image_mime);
        } else if (student.imageAction === 'remove') {
            assignments.push('image_data = NULL', 'image_mime = NULL');
        }
        values.push(id);
        await db.execute(`UPDATE students SET ${assignments.join(', ')} WHERE id = ?`, values);
    }

    static async delete(id) {
        await db.execute('DELETE FROM students WHERE id = ?', [id]);
    }

    static async subcategoriesForCategory(categoryId) {
        const [rows] = await db.execute(
            'SELECT id, name FROM subcategories WHERE category_id = ? AND is_active = TRUE ORDER BY name',
            [categoryId]
        );
        return rows;
    }
}
