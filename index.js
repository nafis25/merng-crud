const { ApolloServer } = require("apollo-server");
const gql = require("graphql-tag");
const mongoose = require("mongoose");
const { ObjectId } = require("mongodb");

const dotenv = require("dotenv");

const dayjs = require("dayjs");
const { GraphQLScalarType, Kind } = require("graphql");
const { UserInputError } = require("apollo-server");

//Models
const Subject = require("./models/Subject");
const Student = require("./models/Student");

//Validator
const { validateStudentInput: validator } = require("./utils/validators");

//Accessing .env file
dotenv.config();

//Custom data-type date for graphql

//GraphQL typedefs
const typeDefs = gql`
   scalar Date

   type Subject {
      id: ID!
      name: String!
      enrolled: [String]
   }

   type SubjectWithStudents {
      id: ID!
      name: String!
      students: [Student]
   }

   type EnrolledSubjects {
      Bangla: Boolean!
      English: Boolean!
      Physics: Boolean!
      Maths: Boolean!
   }

   type Student {
      id: ID!
      name: String!
      email: String!
      phone: String!
      date_of_birth: String!
   }

   type StudentWithSubjects {
      id: ID
      name: String!
      email: String!
      phone: String!
      date_of_birth: String!
      subjects: [Subject]
   }

   input UpdateInput {
      id: ID!
      name: String!
      email: String!
      phone: String!
      date_of_birth: String!
   }

   input StudentInput {
      name: String!
      email: String!
      phone: String!
      date_of_birth: String!
   }

   type Query {
      getStudent(studentId: ID!): Student!
      getStudents: [Student]
      getStudentsWithSubjects: [StudentWithSubjects]

      getSubject(subjectId: ID!): Subject!
      getSubjects: [Subject]
      getSubjectsWithStudents: [SubjectWithStudents]

      checkEnrollment(studentId: ID!): EnrolledSubjects
   }

   type Mutation {
      createStudent(studentInput: StudentInput): Student!
      updateStudent(updateInput: UpdateInput): Student!
      deleteStudent(studentId: ID!): String!

      enrollSubject(studentId: ID!, subjectName: String!): String!
      unEnrollSubject(studentId: ID!, subjectName: String!): String!
   }
`;

//GraphQL resolvers
const resolvers = {
   Query: {
      async getStudent(_, { studentId }) {
         try {
            const student = await Student.findById(studentId);
            return student;
         } catch (err) {
            console.log("Error Getting a Student", err);
         }
      },

      async getStudents() {
         try {
            const students = await Student.find();
            return students;
         } catch (err) {
            console.log("Error Getting Students", err);
         }
      },

      async getStudentsWithSubjects() {
         try {
            const res = await Student.aggregate([
               { $addFields: { stu_id: { $toString: "$_id" } } },
               {
                  $lookup: {
                     from: "subjects",
                     localField: "stu_id",
                     foreignField: "enrolled",
                     as: "subjects",
                  },
               },
               {
                  $project: {
                     id: "$stu_id",
                     name: "$name",
                     email: "$email",
                     phone: "$phone",
                     date_of_birth: "$date_of_birth",
                     subjects: "$subjects",
                  },
               },
            ]);
            console.log(res);
            return res;
         } catch (err) {
            console.log("Error Getting Students with Subjects", err);
         }
      },

      async getSubject(_, { subjectId }) {
         try {
            const subject = await Subject.findById(subjectId);
            return subject;
         } catch (err) {
            console.log("Error Getting a Subject", err);
         }
      },

      async getSubjects() {
         try {
            const subjects = await Subject.find();
            return subjects;
         } catch (err) {
            console.log("Error Getting Subjects", err);
         }
      },

      async getSubjectsWithStudents() {
         try {
            const res = await Subject.aggregate([
               {
                  $addFields: {
                     stu_id: {
                        $map: {
                           input: "$enrolled",
                           as: "ids",
                           in: { $toObjectId: "$$ids" },
                        },
                     },
                     sub_id: {
                        $toString: "$_id",
                     },
                  },
               },
               {
                  $lookup: {
                     from: "students",
                     localField: "stu_id",
                     foreignField: "_id",
                     as: "students",
                  },
               },
               {
                  $project: {
                     id: "$sub_id",
                     name: "$name",
                     students: "$students",
                  },
               },
            ]);
            return res;
         } catch (err) {
            console.log("Error Getting Subjects with Students", err);
         }
      },

      async checkEnrollment(_, { studentId }) {
         const res = await Subject.aggregate([
            {
               $match: { enrolled: studentId },
            },
         ]);

         enrolledSubjects = {
            Bangla: false,
            English: false,
            Physics: false,
            Maths: false,
         };

         res.forEach((subject) => {
            enrolledSubjects[subject.name] = true;
         });

         return enrolledSubjects;
      },
   },

   Mutation: {
      async enrollSubject(_, { studentId, subjectName }) {
         const subjectToEnroll = await Subject.findOne({ name: subjectName });
         if (subjectToEnroll) {
            await Subject.updateOne(
               { name: subjectName },
               {
                  $push: {
                     enrolled: studentId,
                  },
               }
            );
            console.log(subjectToEnroll);
            return `Enrolled!`;
         }
         return `Pera!`;
      },

      async unEnrollSubject(_, { studentId, subjectName }) {
         const subjectToEnroll = await Subject.findOne({ name: subjectName });
         if (subjectToEnroll) {
            await Subject.updateOne(
               { name: subjectName },
               {
                  $pull: {
                     enrolled: studentId,
                  },
               }
            );
            console.log(subjectToEnroll);
            return `Unenrolled!`;
         }
         return `Pera!`;
      },

      async createStudent(
         _,
         { studentInput: { name, email, phone, date_of_birth } }
      ) {
         const emailFound = await Student.findOne({ email });
         if (emailFound)
            throw new UserInputError("Email is taken", {
               errors: {
                  email: "This email is taken",
               },
            });
         const { valid, errors } = validator(name, email, phone, date_of_birth);
         if (!valid) throw new UserInputError("Errors", { errors });
         const newStudent = new Student({
            name: name,
            email: email,
            phone: phone,
            date_of_birth: date_of_birth,
         });
         const res = await newStudent.save();
         return res;
      },

      async updateStudent(
         _,
         { updateInput: { id, name, email, phone, date_of_birth } }
      ) {
         const emailFound = await Student.findOne({ email });
         if (emailFound.email !== email) {
            throw new UserInputError("Email is taken", {
               errors: {
                  email: "This email is taken",
               },
            });
         }

         const { valid, errors } = validator(name, email, phone, date_of_birth);
         if (!valid) throw new UserInputError("Errors", { errors });
         await Student.updateOne(
            { _id: id },
            {
               $set: {
                  name: name,
                  email: email,
                  phone: phone,
                  date_of_birth: date_of_birth,
               },
            }
         );
         updatedStudent = { id, name, email, phone, date_of_birth };
         return updatedStudent;
      },

      async deleteStudent(_, { studentId }) {
         try {
            const studentToDelete = await Student.findById(studentId);
            const idsToPull = await Subject.updateMany(
               { enrolled: studentId },
               {
                  $pull: {
                     enrolled: studentId,
                  },
               }
            );
            if (studentToDelete && idsToPull) {
               await studentToDelete.delete();
               console.log(`Student with ID: ${studentId} deleted`);
               return `Student with ID: ${studentId} deleted`;
            } else {
               console.log(`Student with ID: ${studentId} does not exist`);
               return `Student with ID: ${studentId} does not exist`;
            }
         } catch (err) {
            throw new Error(err);
         }
      },
   },

   Date: new GraphQLScalarType({
      name: "Date",
      description: "Date custom scalar type",
      serialize(value) {
         return dayjs(value).format("MM-DD-YYYY"); // Convert outgoing Date to integer for JSON
      },
      parseValue(value) {
         return dayjs(value); // Convert incoming integer to Date
      },
      parseLiteral(ast) {
         if (ast.kind === Kind.STRING) {
            return dayjs(ast.value); // Convert hard-coded AST string to integer and then to Date
         }
         return null; // Invalid hard-coded value (not an integer)
      },
   }),
};

const server = new ApolloServer({
   typeDefs,
   resolvers,
   context: ({ req }) => ({ req }),
});

mongoose.connect(process.env.DB_CONNECT, { useNewUrlParser: true }).then(() => {
   return server.listen({ port: 5000 }).then((res) => {
      console.log("MongoDB connected");
      console.log(`Server running at ${res.url}`);
   });
});
