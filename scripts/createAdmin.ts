import { connectToMongoDB } from "../src/database/mongodb";
import bcrypt from "bcryptjs";
import User from "../src/models/user.model";

connectToMongoDB();

export default async function CreateAdmin() {
   const existingAdmin = await User.findOne({
    email: process.env.ADMIN_EMAIL
});
   if(existingAdmin){
        console.log("Admin already exits");
   }

   const hashedPassword = await bcrypt.hash(
    process.env.ADMIN_PASSWORD!,
    10)

   const admin = await User.create({
        fullname: process.env.ADMIN_FULLNAME,
        email: process.env.ADMIN_EMAIL,
        password: hashedPassword,
        role: "admin"
    })

   console.log("Admin created successfully:", admin);

}
CreateAdmin()
  .then(() => {
    console.log("Done");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });