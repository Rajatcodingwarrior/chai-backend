import mongoose, {Schema} from "mongoose";

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
export const User = mongoose.model("User", userSchema);
