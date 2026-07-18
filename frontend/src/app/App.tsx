import { BrowserRouter } from "react-router-dom";
import AuthProvider from "./providers/AuthProvider";
import QueryProvider from "./providers/QueryProvider";
import AppRoutes from "./routes/AppRoutes";

export default function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryProvider>
  );
}

