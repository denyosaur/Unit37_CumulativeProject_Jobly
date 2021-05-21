"use strict";

/** Routes for jobs. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureLoggedIn, ensureAuthorized } = require("../middleware/auth");
const Jobs = require("../models/jobs");


const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");
const jobSearchSchema = require("../schemas/jobSearch.json");

const router = new express.Router();

/** POST / { job } =>  { job }
 *
 * job should be { title, salary, equity, company_handle }
 *
 * Returns { title, salary, equity, company_handle }
 *
 * Authorization required: admin
 */
router.post("/", ensureAuthorized, async (req, res, next) => {
    try {
        const validator = jsonschema.validate(req.body, jobNewSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const job = await Jobs.create(req.body);
        return res.status(201).json({ job });
    } catch (err) {
        return next(err);
    }
})

/** GET /  =>
 *   { jobs: [ { title, salary, equity, company_handle }, ...] }
 *
 * Can filter on provided search filters:
 * - title (will find case-insensitive, partial matches)
 * - minSalary
 * - hasEquity
 *
 * Authorization required: none
 */
router.get("/", async (req, res, next) => {
    const q = req.query;
    if (q.minSalary !== undefined) q.minSalary = parseInt(q.minSalary);
    q.hasEquity = q.hasEquity === "true";

    try {
        const validator = jsonschema.validate(q, jobSearchSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }
        const jobs = await Jobs.findAll(q);

        return res.json({ jobs });
    } catch (err) {
        return next(err);
    }
});

/** GET /[id]  =>  { job }
 *
 *  jobs is { title, salary, equity, company_handle }
 *   where company is [{ handle, name, description, numEmployees, logoUrl, jobs }, ...]
 *
 * Authorization required: none
 */
router.get("/:id", async (req, res, next) => {
    try {
        const job = await Jobs.get(req.params.id);
        return res.json({ job });
    }
    catch (err) {
        return next(err);
    }
});

/** PATCH /[id] { title, salary, equity } => { job }
 *
 * Patches job data.
 *
 * fields can be: { title, salary, equity }
 *
 * Returns { title, salary, equity, company_handle }
 *
 * Authorization required: admin
 */
router.patch("/:id", ensureAuthorized, async (req, res, next) => {
    try {
        const validator = jsonschema.validate(req.body, jobUpdateSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }
        const jobId = req.params.id;
        const data = req.body;
        const job = await Jobs.update(jobId, data);
        return res.json({ job });
    } catch (err) {
        return next(err);
    }
});

/** DELETE /[id]  =>  { deleted: id }
 *
 * Authorization: admin
 */
router.delete("/:id", ensureAuthorized, async (req, res, next) => {
    try {
        const job = await Jobs.delete(req.params.id);
        return res.json({ "deleted job ID": req.params.id })
    }
    catch (err) {
        return next(err);
    }
})


module.exports = router;