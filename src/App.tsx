import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Connections from "./routes/connections";
import Connection from "./routes/connection";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Connections />,
  },
  {
    path: "connection",
    element: <Connection />,
  },
]);

export default () => <RouterProvider router={router} />;
