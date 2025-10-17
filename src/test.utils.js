const {Role, DB} = require("./database/database");

class TestUtils {

    randomName() {
        return Math.random().toString(36).substring(2, 12);
    }

     async registerUser(service) {
        const testUser = {
            name: 'pizza diner',
            email: `${this.randomName()}@test.com`,
            password: 'a',
        };
        const registerRes = await service.post('/api/auth').send(testUser);
        registerRes.body.user.password = testUser.password;

        return [registerRes.body.user, registerRes.body.token];
    }

    async registerUsers(amount, service){
        let userNamesAndTokens = []
        for (let i = 0; i < amount; i++) {
            userNamesAndTokens[i] = await this.registerUser(service);
        }
        return userNamesAndTokens;
    }

    async createAdminUser() {
        let user = {password: 'toomanysecrets', roles: [{role: Role.Admin}]};
        user.name = this.randomName();
        user.email = user.name + '@admin.com';

        user = await DB.addUser(user);
        return {...user, password: 'toomanysecrets'};
    }

     expectValidJwt(potentialJwt) {
        expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
    }

    async createMenuItem(){
        const testMenuItem = {title: this.randomName(), description: this.randomName(), image: 'pizza9.png', price: 0.0001, id : 1};
        await DB.addMenuItem(testMenuItem);
        return testMenuItem;
    }

    async createFranchise(name, email) {
        const franchise = {name: name, admins: [{email: email}]};
        await DB.createFranchise(franchise);
        return franchise;
    }

    async createStore(franchise, name){
        const store = {name: name , franchiseId: franchise.id}; //I set the admin user name as the store name to help testing validation
        await DB.createStore(franchise.id, store);
        return store;
    }

}

module.exports = new TestUtils();