import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import Dashboard from "@/pages/Dashboard";
import QuestionBank from "@/pages/QuestionBank";
import ImportWizard from "@/pages/ImportWizard";
import Practice from "@/pages/Practice";
import Progress from "@/pages/Progress";

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/bank" element={<QuestionBank />} />
          <Route path="/import" element={<ImportWizard />} />
          <Route path="/practice/:sessionId" element={<Practice />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}
