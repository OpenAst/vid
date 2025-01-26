import ProtectedRoute from "../components/ProtectedRoute";

const Dashboard = () => {
  return (
    <ProtectedRoute>
      <h1>Welcome to the Dashboard!</h1>
    </ProtectedRoute>
  )
};

export default Dashboard;