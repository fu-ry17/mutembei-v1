import { toast } from "sonner";
import axios from "axios";

export const handleError = (error: unknown): null => {
  if (axios.isAxiosError(error)) {
    toast.error(
      error.response?.data?.error || error.message || "Something went wrong",
    );
  } else if (error instanceof Error) {
    toast.error(error.message);
  } else {
    toast.error("An unexpected error occurred");
  }

  return null;
};
