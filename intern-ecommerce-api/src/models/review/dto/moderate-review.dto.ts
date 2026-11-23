import { ReviewStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class ReviewStatusDto {
  /** VISIBLE or HIDDEN */
  @IsEnum(ReviewStatus)
  status: ReviewStatus;
}

export class ReviewReplyDto {
  /** Answer shown under the review; null or empty removes it */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(1000)
  reply?: string | null;
}
