const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterEach,
    commonAfterAll,
    u1Token,
    u4Token,
    testJobIds
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

describe("POST /jobs", () => {
    const newJob = {
        title: "new test job",
        salary: 42069,
        equity: 0.12345,
        company_handle: "c1"
    };

    test("ok for users", async () => {
        const res = await request(app)
            .post("/jobs")
            .send(newJob)
            .set("authorization", `Bearer ${u4Token}`);
        expect(res.statusCode).toEqual(201);
        expect(res.body).toEqual({
            job: {
                title: 'new test job',
                salary: 42069,
                equity: '0.12345',
                companyhandle: 'c1'
            }
        });
    });

    test("bad request with missing data", async () => {
        const res = await request(app)
            .post("/jobs")
            .send({
                salary: 42069,
                equity: 0.12345,
            })
            .set("authorization", `Bearer ${u4Token}`);
        expect(res.statusCode).toEqual(400);
    });

    test("bad request with invalid data", async () => {
        const res = await request(app)
            .post("/jobs")
            .send({
                title: "new test job",
                salary: "12345",
                equity: 1234,
                company_handle: "scott-smith"
            })
            .set("authorization", `Bearer ${u4Token}`);
        expect(res.statusCode).toEqual(400);
    });
});

/************************************** GET /jobs */
describe("GET all /jobs", () => {
    test("ok for anon", async () => {
        const res = await request(app).get("/jobs");
        expect(res.body).toEqual({
            jobs: [
                { title: 'Job1', salary: 100, equity: '0.1', companyHandle: 'c1' },
                { title: 'Job2', salary: 200, equity: '0.2', companyHandle: 'c1' },
                { title: 'Job3', salary: 300, equity: '0', companyHandle: 'c1' },
                { title: 'Job4', salary: null, equity: null, companyHandle: 'c1' }
            ]
        })
    });

    test("GET /jobs with title params", async () => {
        const res = await request(app).get("/jobs").query({ title: "3" });
        expect(res.body).toEqual({
            jobs: [
                { title: 'Job3', salary: 300, equity: '0', companyHandle: 'c1' }
            ]
        })
    })

    test("GET /jobs with minSalary params", async () => {
        const res = await request(app).get("/jobs").query({ title: "3", minSalary: 299 });
        expect(res.body).toEqual({
            jobs: [
                { title: 'Job3', salary: 300, equity: '0', companyHandle: 'c1' }
            ]
        })
    })

    test("GET /jobs with hasEquity params", async () => {
        const res = await request(app).get("/jobs").query({ hasEquity: true });
        expect(res.body).toEqual({
            jobs: [
                { title: 'Job1', salary: 100, equity: '0.1', companyHandle: 'c1' },
                { title: 'Job2', salary: 200, equity: '0.2', companyHandle: 'c1' }
            ]
        }
        )
    })
});

/************************************** GET /jobs/:id */
describe("GET /jobs/:id", async () => {
    test("works", async () => {
        const res = await request(app).get(`/jobs/${testJobIds[0]}`);
        expect(res.body).toEqual({
            job: {
                id: testJobIds[0],
                title: 'Job1',
                salary: 100,
                equity: '0.1',
                companyHandle: 'c1',
                company: {
                    handle: 'c1',
                    name: 'C1',
                    numemployees: 1,
                    description: 'Desc1',
                    logourl: 'http://c1.img'
                }
            }
        });
    });

    test("not found if no such job ", async () => {
        const res = await request(app).get(`/jobs/1000000`)
        expect(res.body).toEqual({ error: { message: 'Job 1000000 not found', status: 404 } })
    });
});

/************************************** update */
describe("patch /jobs/:id", () => {
    const newData = {
        title: "updated title",
        salary: 42069,
        equity: 0.04444
    }

    test("works correctly", async () => {
        const res = await request(app).patch(`/jobs/${testJobIds[0]}`).send(newData).set("authorization", `Bearer ${u4Token}`);
        expect(res.body).toEqual({
            job: {
                id: testJobIds[0],
                title: 'updated title',
                salary: 42069,
                equity: '0.04444',
                companyHandle: 'c1'
            }
        }
        )
    })

    test("not authorized", async () => {
        const res = await request(app).patch(`/jobs/${testJobIds[0]}`).send(newData).set("authorization", `Bearer ${u1Token}`);
        expect(res.body).toEqual({ "error": { "message": "Unauthorized", "status": 401 } }
        )
    })

    test("no job found", async () => {
        const res = await request(app).patch(`/jobs/1`).send(newData).set("authorization", `Bearer ${u4Token}`);
        expect(res.body).toEqual({ error: { message: 'No job: 1', status: 404 } }
        )
    })

    test("invalid data sent", async () => {
        const res = await request(app).patch(`/jobs/${testJobIds[0]}`).send({
            title: "updated title",
            salary: "42069",
            equity: 0.04444
        }).set("authorization", `Bearer ${u4Token}`);
        expect(res.body).toEqual({
            error: {
                message: ['instance.salary is not of a type(s) integer'],
                status: 400
            }
        }
        )
    })
})

describe("DELETE on /jobs/:id", async () => {
    test("delete correctly", async () => {
        const res = await request(app).delete(`/jobs/${testJobIds[0]}`).set("authorization", `Bearer ${u4Token}`);
        expect(res.body).toEqual({ "deleted job ID": `${testJobIds[0]}` }
        )
    })

    test("delete not authorized", async () => {
        const res = await request(app).delete(`/jobs/${testJobIds[0]}`).set("authorization", `Bearer ${u1Token}`);
        expect(res.body).toEqual({ "error": { "message": "Unauthorized", "status": 401 } });
    })

    test("delete not job not available", async () => {
        const res = await request(app).delete(`/jobs/1000000000000`).set("authorization", `Bearer ${u4Token}`);
        expect(res.body).toEqual({
            error: {
                message: 'value "1000000000000" is out of range for type integer',
                status: 500
            }
        }
        );
    })
})