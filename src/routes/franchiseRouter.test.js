const {Role, DB} = require('../database/database');
const request = require("supertest");
const app = require("../service");
const utils = require('../test.utils.js');


function randomName() {
    return Math.random().toString(36).substring(2, 12);
}

let testAdmin;
let adminUserAuthToken;

beforeAll(async () => {
    testAdmin = await utils.createAdminUser()
    const loginRes = await request(app).put('/api/auth/').send(testAdmin);
    adminUserAuthToken = loginRes.body.token;
    utils.expectValidJwt(loginRes.body.token);

});

afterAll(async () => {
    await DB.deleteDatabase();
})

test('create franchise positive', async () =>{
    const newFranchise = {name: randomName(), admins: [{email: testAdmin.email}]};
    const createRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${adminUserAuthToken}`).send(newFranchise);

    expect(createRes.status).toBe(200);
    expect(createRes.body.name).toMatch(newFranchise.name);
    expect(createRes.body.admins[0].email).toMatch(testAdmin.email);

});

test('list franchises', async () =>{
    const listRes = await request(app).get('api/franchise?page=0&limit=10&name=*');

    expect(listRes.status).toBe(200);
    expect(listRes.body.franchises.length).toBeGreaterThan(0);
    expect(listRes.body.franchises[0].name).toMatch(testAdmin.name);
})
