import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema({
  username:{
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true // helps in faster search
  },
  email:{
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  fullname:{
    type: String,
    required: true,
    trim: true,
    index: true // helps in faster search
  },
  avatar:{
    type: String, //cloudinary url
    required:true,
  },
  coverImage:{
    type: String, //cloudinary url
  },
  watchHistory:[{
    type: Schema.Types.ObjectId,
    ref: "Video"
  }],
  password:{
    type: String,
    required: [true, "Password is required"],
  },
  refreshToken:{
    type: String,
  }
},{
  timestamps: true
  }
)

//hash password before saving user
userSchema.pre("save", async function(next){
  if(!this.isModified("password")) return next();
  
  this.password = await bcrypt.hash(this.password,10) 
  next()
})

userSchema.methods.isPasswordCorrect = async function 
(password){
  return await bcrypt.compare(password, this.password);
}

userSchema.methods.generateAccessToken = function (){
  return jwt.sign(
    {
      _id: this._id,
      username: this.username,
      email: this.email,
      fullname: this.fullname,
    },
    process.env.ACESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACESS_TOKEN_EXPIRY
    }
  )}


  userSchema.methods.generateRefreshToken = function (){
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    }
  )}


export const User = mongoose.model("User", userSchema);
