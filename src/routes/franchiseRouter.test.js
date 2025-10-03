const {Role, DB} = require('../database/database');
const request = require("supertest");
const app = require("../service");
const utils = require('../test.utils.js');

let testAdmin;
let adminUserAuthToken;
let testFranchise;

beforeAll(async () => {
    testAdmin = await utils.createAdminUser()
    const loginRes = await request(app).put('/api/auth/').send(testAdmin);
    adminUserAuthToken = loginRes.body.token;
    utils.expectValidJwt(loginRes.body.token);

    testFranchise = await utils.createFranchise(testAdmin.name, testAdmin.email);
    const testStore = await utils.createStore(testFranchise, testAdmin.name);
});

afterAll(async () => {
    await DB.deleteDatabase();
})

test('create franchise positive', async () =>{
    const newFranchise = {name: utils.randomName(), admins: [{email: testAdmin.email}]};
    const createRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${adminUserAuthToken}`).send(newFranchise);

    expect(createRes.status).toBe(200);
    expect(createRes.body.name).toMatch(newFranchise.name);
    expect(createRes.body.admins[0].email).toMatch(testAdmin.email);

});

test('list franchises', async () =>{
    const listRes = await request(app).get('/api/franchise?page=0&limit=10&name=*');

    expect(listRes.status).toBe(200);
    expect(listRes.body.franchises.length).toBeGreaterThanOrEqual(1);

});

test('delete franchise', async () =>{
    const randomName = utils.randomName();
    const franchiseToDelete = await utils.createFranchise(randomName, testAdmin.email);
    const deleteRes = await request(app).delete(`/api/franchise//:${franchiseToDelete.id}`).set('Authorization', `Bearer ${adminUserAuthToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.message).toMatch('franchise deleted');
});

test('create store', async () =>{
    const newStore = {name: testAdmin.name, franchiseId: testFranchise.id};
    const storeRes = await request(app).post(`/api/franchise/${testFranchise.id}/store`).set('Authorization', `Bearer ${adminUserAuthToken}`).send(newStore);

    expect(storeRes.status).toBe(200);
    expect(storeRes.body.name).toMatch(newStore.name);
    expect(storeRes.body.franchiseId).toBe(1);

});

test('delete store', async () =>{
    const randomName = utils.randomName();
    const storeToDelete = await utils.createStore(testFranchise, randomName);
    const deleteRes = await request(app).delete(`/api/franchise/${testFranchise.id}/store/${storeToDelete.id}`).set('Authorization', `Bearer ${adminUserAuthToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.message).toMatch('store deleted');
});
