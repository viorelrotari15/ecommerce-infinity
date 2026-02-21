import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FirebaseLoginDto {
  @ApiProperty({ description: 'Firebase ID token from signInWithPopup / signInWithRedirect' })
  @IsString()
  @IsNotEmpty()
  idToken: string;
}
