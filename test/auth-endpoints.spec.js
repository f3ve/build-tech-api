const knex = require('knex')
const jwt = require('jsonwebtoken')
const app = require('../src/app')
const helpers = require('./test-helpers')

describe('Auth Endpoints', function() {
  let db

  const { testUsers } = helpers.makeBuildsFixtures()
  const testUser = testUsers[0]

  before('make knex instrance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DATABASE_URL,
    })
    app.set('db', db)
  })

  after('disconnect from db', () => db.destroy())

  before('cleanup', () => helpers.cleanTables(db))

  afterEach('cleanup', () => helpers.cleanTables(db))

  describe(`POST /api/auth/login`, () => {
    beforeEach('insert users', () =>
      helpers.seedUsers(
        db,
        testUsers,
      )
    )

    const requiredFields = ['username', 'user_password']

    requiredFields.forEach(field => {
      const loginAttemptBody = {
        username: testUser.username,
        user_password: testUser.user_password
      }

      it(`responds with 400 and required error when '${field}' is missing`, () => {
        delete loginAttemptBody[field]

        return supertest(app)
          .post('/api/auth/login')
          .send(loginAttemptBody)
          .expect(400, {
            error: `Missing '${field}' in request body`
          })
      })
    })

    it(`responds with 400 'invalid username or password' when bad username`, () => {
      const userInvalidUser = {username: 'wrong', user_password: testUser.user_password}
      return supertest(app)
        .post('/api/auth/login')
        .send(userInvalidUser)
        .expect(400, {error: `Incorrect Username or password`})
    })

    it(`responds with 400 'Invalid username or password' when bad password`, () => {
      const userInvalidPass = {username: testUser.username, user_password: 'wrong'}
      return supertest(app)
        .post('/api/auth/login')
        .send(userInvalidPass)
        .expect(400, {error: `Incorrect Username or password`})
    })

    it.only(`responds with 200 and JWT auth token using secret when valid credentials`, () => {
      const userValidCreds = {
        username: testUser.username,
        user_password: testUser.user_password,
      }
      const expectedToken = jwt.sign(
        { id: testUser.id},
        process.env.JWT_SECRET,
        {
          subject: testUser.username,
          expiresIn: process.env.JWT_EXPIRY,
          algorithm: 'HS256',
        }
      )
        return supertest(app)
        .post('/api/auth/login')
        .send(userValidCreds)
        .expect(200)
    })
  })

  describe(`POST /api/auth/refresh`, () => {
    beforeEach('insert users', () =>
      helpers.seedUsers(
        db,
        testUsers
      )
    )

    it(`responds 200 and JWT auth token using secret`, () => {
      const expectedToken = jwt.sign(
        {id: testUser.id},
        process.env.JWT_SECRET,
        {
          subject: testUser.username,
          expiresIn: process.env.JWT_EXPIRY,
          algorithm: 'HS256'
        }
      )
      return supertest(app)
        .post('/api/auth/refresh')
        .set('Authorization', helpers.makeAuthHeader(testUser))
        .expect(200, {
          authToken: expectedToken,
        })
    })
  })
})
