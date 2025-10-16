import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";


export const verifyJWT = asyncHandler(async(req,res,next)=>{
  //get token from cookies
  try {
    const token = req.cookies?.accessToken||req.headers("Authorization")?.replace("Bearer ","");
    if(!token){
      throw new ApiError(401,"unauthorized request")
    }
    const decodedToken = jwt.verify(token,process.env.ACESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
    if(!user){
      throw new ApiError(401,"unauthorized request , user not found")
    }
    req.user = user;
    next();
    
  } catch (error) {
    throw new ApiError(401,"unauthorized request , invalid token")
    
  }
});
