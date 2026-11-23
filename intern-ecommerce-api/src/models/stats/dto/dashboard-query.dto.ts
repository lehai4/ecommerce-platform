import { IsOptional, Matches } from 'class-validator';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Period of the dashboard; defaults to the last 30 days */
export class DashboardQueryDto {
  /** First day (included), YYYY-MM-DD
   * @example "2026-11-01"
   */
  @IsOptional()
  @Matches(DAY, { message: 'from must be YYYY-MM-DD' })
  from?: string;

  /** Last day (included), YYYY-MM-DD
   * @example "2026-11-30"
   */
  @IsOptional()
  @Matches(DAY, { message: 'to must be YYYY-MM-DD' })
  to?: string;
}
