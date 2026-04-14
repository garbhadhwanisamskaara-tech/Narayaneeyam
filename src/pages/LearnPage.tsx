import { Navigate } from "react-router-dom";

/** Learn page has been merged into Chant page — redirect */
export default function LearnPage() {
  return <Navigate to="/chant" replace />;
}
