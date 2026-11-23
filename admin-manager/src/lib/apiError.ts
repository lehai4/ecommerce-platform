/** Turns an axios error from the API into a readable message */
export const apiErrorMessage = (error: any): string => {
  const message = error?.response?.data?.message;
  return Array.isArray(message) ? message.join(", ") : message || error?.message;
};
