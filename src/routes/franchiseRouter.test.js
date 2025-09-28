const {Role, DB} = require('../database/database');
const request = require("supertest");
const app = require("../service");


function randomName() {
    return Math.random().toString(36).substring(2, 12);
}

let testAdmin= {};

beforeAll(async () => {
    const userName = randomName();
    testAdmin = {name: userName, email: userName + '@gmail.com', password: 'a', roles: [{role: Role.Admin}]};
    await DB.addUser(testAdmin);

});

test('create franchise positive', async () =>{
    const newFranchise = {name: randomName(), admins: [{email: testAdmin.email}]};
    const loginRes = await request(app).put('/api/auth/login').send(testAdmin);
    const createRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${loginRes.body.token}`).send(newFranchise);

    expect(createRes.status).toBe(200);
    expect(createRes.body.name).toMatch(newFranchise.name);
    expect(createRes.body.admins.email).toMatch(testAdmin.email);

});
