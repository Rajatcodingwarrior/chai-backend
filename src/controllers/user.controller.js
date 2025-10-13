import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  //steps
  //1 get the data from frontend
  //2 validation - not empty
  //3 check user already exists username or email
  //4 check for images ,check for avatar
  //5 upload to cloudinary
  //6 create user object - create entry in db
  //7 remove password and refresh token from user object
  //8 check for user created or not
  //9 send response to frontend

  //1 get the data from frontend
  const { fullname , email , username , password } = req.body;
  // console.log("email : ", email);

  //2 validation - not empty
  // if(fullname === "" || email === "" || username === "" || password === ""){
  //   throw new ApiError(400, "All fields are required");
  // }

  if(
    [fullname , email , username , password].some((field) => 
    field?.trim() === "")
  ){
    throw new ApiError(400, "All fields are required");
  }

  //3 check user already exists username or email
  const existedUser = await User.findOne({
    $or: [{email}, {username}]
  });

  if(existedUser){
    throw new ApiError(409, "User already exists with this email or username");
  }

  //4 check for images ,check for avatar
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
  let coverImageLocalPath;
  if( req.files && Array.isArray( req.files.coverImage) && req.files.coverImage.length >0 ){
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if(!avatarLocalPath){
    throw new ApiError(400, "Avatar is required");
  }

  //5 upload to cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if(!avatar){
    throw new ApiError(500, "Could not upload avatar image , please try again");
  }

  //6 create user object - create entry in db
  const newUser = await User.create({
    fullname,
    email,
    username: username.toLowerCase(),
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  //7 remove password and refresh token from user object
  const createdUser = await User.findById(newUser._id).select(
    "-password -refreshToken "
  );

  //8 check for user created or not
  if(!createdUser){
    throw new ApiError(500, "Something went wrong while registering user");
  }

  //9 send response to frontend
  return res.status(201).json(
    new ApiResponse(200, createdUser, "User registered successfully")
  );

});

export { registerUser };