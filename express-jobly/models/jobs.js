const db = require("../db");
const { NotFoundError } = require("../expressError");
const { sqlForPartialUpdate, checkJobsQuery, sqlForJobSearch } = require("../helpers/sql");

/** Related functions for jobs. */

class Jobs {
    /** Create a job (from data), update db, return new job data.
 *
 * data should be { title, salary, equity, company_handle }
 *
 * Returns { title, salary, equity, company_handle }
 *
 * Throws BadRequestError if job already in database.
 * */
    static async create({ title, salary, equity, company_handle }) {
        const res = await db.query(`
        INSERT INTO jobs
        (title, salary, equity, company_handle)
        VALUES ($1, $2, $3, $4)
        RETURNING title, salary, equity, company_handle AS companyHandle`,
            [title, salary, equity, company_handle]);

        const job = res.rows[0];
        return job
    }

    /** Find all jobs OR find jobs that fit the query params for title, minSalary, hasEquity
     *
     * Returns [{ title, salary, equity, company_handle }, ...]
     * */
    static async findAll(query) {
        const keysArray = Object.keys(query);
        const querySql =
            `SELECT title,
            salary,
            equity,
            company_handle AS "companyHandle"
          FROM jobs`;
        if (query.hasEquity === false && keysArray.length === 1) {
            const jobsRes = await db.query(`${querySql} ORDER BY title`);
            return jobsRes.rows;
        } else {
            if (checkJobsQuery(keysArray)) throw new NotFoundError(`Incorrect Queries: ${keysArray}`);

            const { where, values } = sqlForJobSearch(query);
            const jobRes = await db.query(`${querySql} WHERE ${where} ORDER BY title`, values);
            return jobRes.rows;
        }
    }
    /** Given a job ID, return data about job and company.
       *
       * Returns { handle, name, description, numEmployees, logoUrl, jobs }
       *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
       *
       * Throws NotFoundError if not found.
       **/
    static async get(id) {
        const jobRes = await db.query(`
        SELECT id, title, salary, equity, company_handle AS "companyHandle"
        FROM jobs
        WHERE id=$1`, [id]);
        const job = jobRes.rows[0];

        if (!job) throw new NotFoundError(`Job ${id} not found`, 404);

        const company = await db.query(`
        SELECT handle, name, num_employees AS numEmployees, description, logo_url AS logoUrl
        FROM companies 
        WHERE handle=$1`, [job.companyHandle]);
        job.company = company.rows[0];

        return job;
    }
    /** Update job data with `data`.
     *
     * This is a "partial update" --- it's fine if data doesn't contain all the
     * fields; this only changes provided ones.
     *
     * Data can include: {title, salary, equity}
     *
     * Returns {id, title, salary, equity, companyHandle}
     *
     * Throws NotFoundError if not found.
     */

    static async update(jobId, data) {
        const { setCols, values } = sqlForPartialUpdate(
            data,
            {});
        const idVarIdx = "$" + (values.length + 1);

        const querySql = `UPDATE jobs 
                          SET ${setCols} 
                          WHERE id = ${idVarIdx} 
                          RETURNING id, 
                                    title, 
                                    salary, 
                                    equity,
                                    company_handle AS "companyHandle"`;
        const result = await db.query(querySql, [...values, jobId]);
        const job = result.rows[0];
        if (!job) throw new NotFoundError(`No job: ${jobId}`);

        return job;
    }
    /** Delete given job from database; returns undefined.
     *
     * Throws NotFoundError if company not found.
     **/
    static async delete(jobId) {
        const res = await db.query(`
        DELETE FROM jobs
        WHERE id=$1
        RETURNING id`, [jobId]);
        const job = res.rows[0];
        if (!job) throw new NotFoundError(`No job: ${jobId}`);

        return job
    }
}

module.exports = Jobs;