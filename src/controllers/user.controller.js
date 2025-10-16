import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";


const generateAccessAndRefreshTokens = async (userId)=>{
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({validateBeforeSave:false});
    return {accessToken,refreshToken};
    
  } catch (error) {
    throw new ApiError(500,"Could not generate access and refresh token")
    
  }
}

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

const loginUser = asyncHandler(async (req,res) =>{
  // req body - data
  // username or email
  // find the user
  // password check
  // access and refresh token
  //send cookie
  //response to frontend

  const {username,email,password}=req.body

  if(!username && !email){
    throw new ApiError(400,"Username or email is required")
  }

  const user = await User.findOne({
    $or:[{username},{email}]
  });

  if(!user){
    throw new ApiError(404,"User not found , invalid username or email")
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password);
  if(!isPasswordCorrect){
    throw new ApiError(401,"Invalid password")
  }

  const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id);

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly:true,
    secure:true,
  }

  return res
  .status(200)
  .cookie("accessToken",accessToken,options)
  .cookie("refreshToken",refreshToken,options)
  .json(
    new ApiResponse(
      200,
      {
        user: loggedInUser,
        accessToken,
        refreshToken 
      },
      "User logged in successfully"
    )
  )
  
});

const logoutUser = asyncHandler(async (req,res) =>{
  //get user id from req.user
  //find the user from db
  //remove refresh token from db
  //remove cookies - access token and refresh token
  //send response to frontend

  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {refreshToken: undefined}
    },
    {new:true}
  );

  const options = {
    httpOnly:true,
    secure:true,
  }

  return res
  .status(200)
  .clearCookie("accessToken",options)
  .clearCookie("refreshToken",options)
  .json(
    new ApiResponse(200,null,"User logged out successfully")
  )

});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
            
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

});

const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body

    

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
});

const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user,
        "User fetched successfully"
    ))
});

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body

    if (!fullname || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email: email
            }
        },
        {new: true}
        
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
});

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    //TODO: delete old image - assignment

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar image updated successfully")
    )
});


const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    }

    //TODO: delete old image - assignment


    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover image updated successfully")
    )
});


export { 
  registerUser,
  loginUser,
  logoutUser ,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
};