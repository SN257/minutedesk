import { IsEmail, IsNotEmpty, IsString, Length, MinLength } from 'class-validator';

export class RequestForgotPasswordOtpDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class VerifyForgotPasswordOtpDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @Length(6, 6)
  otp: string;
}

export class VerifyProfilePasswordOtpDto {
  @IsString()
  @Length(6, 6)
  otp: string;
}

export class CompletePasswordResetDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}
