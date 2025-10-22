const { DB} = require('../database/database');
const request = require("supertest");
const app = require("../service");
const utils = require('../test.utils.js');

let testAdmin;
let adminUserAuthToken;
let testFranchise;

let testUser = { name: utils.randomName() , email: 'user@test.com', password: 'a' };
let testUserAuthToken;

beforeAll(async () => {

    testUser.email = testUser.name + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(testUser);
    testUserAuthToken = registerRes.body.token;
    utils.expectValidJwt(testUserAuthToken);

    testAdmin = await utils.createAdminUser()
    const loginRes = await request(app).put('/api/auth/').send(testAdmin);
    adminUserAuthToken = loginRes.body.token;
    utils.expectValidJwt(loginRes.body.token);

    testFranchise = await utils.createFranchise(testAdmin.name, testAdmin.email);

});

afterAll(async () => {
    await DB.truncateAllTables();
})

test('create franchise positive', async () =>{
    const newFranchise = {name: utils.randomName(), admins: [{email: testAdmin.email}]};
    const createRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${adminUserAuthToken}`).send(newFranchise);

    expect(createRes.status).toBe(200);
    expect(createRes.body.name).toMatch(newFranchise.name);
    expect(createRes.body.admins[0].email).toMatch(testAdmin.email);

});

test('create franchise negative not admin', async () =>{
    const newFranchise = {name: utils.randomName(), admins: []};
    const createRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${testUserAuthToken}`).send(newFranchise);

    expect(createRes.status).toBe(403);
    expect(createRes.body.message).toMatch('unable to create a franchise');
    
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
