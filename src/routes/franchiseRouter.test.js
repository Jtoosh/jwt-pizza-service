const {Role, DB} = require('../database/database');
const request = require("supertest");
const app = require("../service");


function randomName() {
    return Math.random().toString(36).substring(2, 12);
}

let franchiseeTest = {};

beforeAll(async () => {
    const userName = randomName();
    franchiseeTest = {name: userName, email: userName + '@gmail.com', password: 'f', roles: [{role: Role.Franchisee}]};
    await DB.addUser(franchiseeTest);

});

test('create franchise positive', async () =>{
    const newFranchise = {name: randomName(), admins: [{email: franchiseeTest.email}]};
    const loginRes = await request(app).put('/api/auth/login').send(franchiseeTest);
    const createRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${loginRes.body.token}`).send(newFranchise);

    expect(createRes.status).toBe(200);
    expect(createRes.body.name).toMatch(newFranchise.name);
    expect(createRes.body.admins.email).toMatch(franchiseeTest.email);

});
