const { User, Book } = require("../../lib/models");
const { expect } = require("chai");
const jwt = require("jsonwebtoken");
const faker = require("faker");
const config = require("config");
const mongoose = require("mongoose");
const dbHandler = require("../helpers/db_handler");
const { genMockBookData, genMockUserData } = require("../helpers/mock");

describe("User model", () => {
  let password, userData, bookData;
  before(() => {
    password = "password";
    bookData = genMockBookData();
    userData = genMockUserData();
  });

  describe("Password && jwt", () => {
    it("should create hash from password", async () => {
      const user = new User();
      await user.setPassword(password);
      expect(user.password).to.exist;
      expect(user.password).to.be.a("string");
      expect(user.password).to.have.lengthOf(60);
    });

    it("should retrun true if a correct password is passed", async () => {
      const user = new User();
      await user.setPassword(password);
      const result = await user.verifyPassword(password);
      expect(result).to.be.a("boolean");
      expect(result).to.be.true;
    });

    it("should retrun false if an incorrect password is passed", async () => {
      const user = new User();
      await user.setPassword("passwordd");
      const result = await user.verifyPassword(password);
      expect(result).to.be.a("boolean");
      expect(result).to.be.false;
    });

    it("should generate a valid json web token", (done) => {
      const payload = {
        _id: new mongoose.Types.ObjectId().toHexString(),
        email: faker.internet.email(),
      };

      const user = new User(payload);
      const token = user.generateAuthToken();
      const decoded = jwt.verify(token, config.get("jwtPrivateKey"));
      expect(decoded).to.deep.include(payload);
      done();
    });
  });

  describe("Data Access Layer", () => {
    let user, book;

    const execUser = async () => {
      user = new User(userData);
      await user.save();
    };

    const execBook = async () => {
      book = new Book(bookData);
      await book.save();
    };

    before(async () => {
      await dbHandler.connect();
    });

    after(async () => {
      await dbHandler.closeDatabase();
    });

    afterEach(async () => {
      await dbHandler.clearDatabase();
    });

    it("should push bookId to user's book_created", async () => {
      execUser();
      execBook();

      await User.updateBooksCreated(book._id, user._id, "+");
      user = await User.findById(user._id);
      expect(user.books_created).to.have.lengthOf(1);
      expect(user.books_created[0]).to.eql(book._id.toString());
    });
  });
});
