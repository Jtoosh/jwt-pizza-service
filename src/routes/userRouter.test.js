const { DB} = require('../database/database');
const request = require("supertest");
const app = require("../service");
const utils = require('../test.utils.js');

const username = utils.randomName();
const testUser = { name: username, email: 'reg@test.com', password: 'a' };
let testUserAuthToken;
// let adminUserAuthToken;



beforeAll(async () => {
    testUser.email = username + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(testUser);
    testUserAuthToken = registerRes.body.token;
    utils.expectValidJwt(testUserAuthToken);


    // const adminUser = await utils.createAdminUser();
    // const loginRes = await request(app).put('/api/auth/').send(adminUser);
    // adminUserAuthToken = loginRes.body.token;
    // utils.expectValidJwt(loginRes.body.token);
});

afterAll(async () => {
    await DB.deleteDatabase();
});

test('update user negative', async () => {
    const updatedUser = {name: utils.randomName(), email: utils.randomName() + '@test.com', password: utils.randomName()};
    const updateRes = await request(app).put(`/api/user/${testUser.id}`).set('Authorization', `Bearer ${testUserAuthToken}`).send(updatedUser);

    expect(updateRes.statusCode).toBe(403);
    expect(updateRes.body.message).toMatch('unauthorized');


})