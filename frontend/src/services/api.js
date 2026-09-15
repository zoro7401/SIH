// API base URL
const configuredApiUrl = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");
const normalizedApiUrl = configuredApiUrl.replace(/\/api(?:\/api)+$/i, "/api");
const API_BASE_URL = normalizedApiUrl.endsWith("/api")
  ? normalizedApiUrl
  : `${normalizedApiUrl}/api`;

// Create headers with auth token if available
const getHeaders = () => {
  const token = localStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const getMultipartHeaders = () => {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Auth API calls
export const authAPI = {
  // Register new user
  register: async (email, password, name, role) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: getHeaders(),
      credentials: "include",
      body: JSON.stringify({ email, password, name, role }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Registration failed");
    }

    return data;
  },

  // Login user
  login: async (email, password, rememberMe = false) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: getHeaders(),
      credentials: "include",
      body: JSON.stringify({ email, password, rememberMe }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Login failed");
    }

    return data;
  },

  // Get current user (protected route)
  getCurrentUser: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: "GET",
      headers: getHeaders(),
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch user");
    }

    return data;
  },

  syncSupabaseUser: async (accessToken, profile = {}) => {
    const response = await fetch(`${API_BASE_URL}/auth/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(profile),
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to sync user profile");
    }

    return data;
  },

  logout: async () => {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  },

  clearLocalUser: () => {
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to change password");
    }

    return data;
  },
};

// Assessment API calls (skill tests + skill profile persisted in Supabase)
export const assessmentAPI = {
  getSkillTestResults: async () => {
    const response = await fetch(`${API_BASE_URL}/assessments/skill-tests/results`, {
      method: "GET",
      headers: getHeaders(),
      credentials: "include",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch assessment results");
    return data;
  },

  submitSkillTestResult: async (testId, payload) => {
    const response = await fetch(`${API_BASE_URL}/assessments/skill-tests/${testId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to submit assessment result");
    return data;
  },

  getSkillProfile: async () => {
    const response = await fetch(`${API_BASE_URL}/assessments/skill-profile`, {
      method: "GET",
      headers: getHeaders(),
      credentials: "include",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch skill profile");
    return data;
  },

  upsertSkillProfileEntry: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/assessments/skill-profile/upsert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to update skill profile");
    return data;
  },

  // Dynamic tests: 20-question objective tests per skill sourced from the
  // assessment_questions bank. skillName is encoded since several skill
  // names contain "/" (e.g. "SQL / Databases").
  getDynamicTest: async (skillName) => {
    const response = await fetch(`${API_BASE_URL}/assessments/dynamic-tests/${encodeURIComponent(skillName)}`, {
      method: "GET",
      headers: getHeaders(),
      credentials: "include",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch assessment questions");
    return data;
  },

  submitDynamicTest: async (skillName, answers) => {
    const response = await fetch(`${API_BASE_URL}/assessments/dynamic-tests/${encodeURIComponent(skillName)}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ answers }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to submit assessment result");
    return data;
  },
};

// AI Career Advisor — real LLM call (Gemini, via the backend so the API
// key never reaches the browser). context carries the student's real
// readiness/matched/missing skills so the model answers grounded in actual
// data instead of guessing.
export const aiAdvisorAPI = {
  getHistory: () => request("/ai-advisor/history"),
  clearHistory: () => request("/ai-advisor/history", { method: "DELETE" }),
  ask: async (message, context) => {
    const response = await fetch(`${API_BASE_URL}/ai-advisor/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ message, context }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = new Error(data.error || "AI Career Advisor request failed");
      err.status = response.status;
      throw err;
    }

    return data;
  },

  generateRoadmap: async (skill, currentLevel, format) => {
    const response = await fetch(`${API_BASE_URL}/ai-advisor/roadmap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ skill, currentLevel, format }),
    });
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || "Failed to generate roadmap");
      error.status = response.status;
      throw error;
    }
    return data;
  },

  // Analyzes the student's most recently completed skill-test run (see
  // assessmentController.submitDynamicTest / aiAdvisorController.analyzeLatestSkillRun)
  // — strengths, weaknesses, and an improvement roadmap grounded in real scores.
  analyzeLatestRun: async (generate = true) => {
    const query = generate ? "?generate=true" : "";
    const response = await fetch(`${API_BASE_URL}/ai-advisor/analyze-latest-run${query}`, {
      method: "GET",
      headers: getHeaders(),
      credentials: "include",
    });
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || "Failed to analyze your results");
      error.status = response.status;
      throw error;
    }
    return data;
  },
};

// Generic authenticated JSON request helper for the full-migration endpoints
// below — every one of these follows the exact same fetch/credentials/error
// shape as authAPI/assessmentAPI, so this avoids repeating it 20+ times.
async function request(path, { method = "GET", body } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: getHeaders(),
    credentials: "include",
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.error || `Request to ${path} failed`);
    err.status = response.status;
    throw err;
  }
  return data;
}

// Student state (target role, learning progress, notification prefs/read
// state, enrollments) — see backend/src/routes/studentStateRoutes.js
export const studentStateAPI = {
  getTargetRole: () => request("/student/target-role"),
  setTargetRole: (roleId) => request("/student/target-role", { method: "POST", body: { roleId } }),

  getLearningProgress: () => request("/student/learning-progress"),
  setLearningProgress: (skillName, completedModules) =>
    request("/student/learning-progress", { method: "POST", body: { skillName, completedModules } }),

  getNotificationPreferences: () => request("/student/notification-preferences"),
  saveNotificationPreferences: (prefs) => request("/student/notification-preferences", { method: "POST", body: prefs }),

  getReadNotificationIds: () => request("/student/notification-read-state"),
  markNotificationsRead: (notificationIds) =>
    request("/student/notification-read-state", { method: "POST", body: { notificationIds } }),

  getEnrolledCourseIds: () => request("/student/enrollments"),
  enrollInCourse: (courseId) => request("/student/enrollments", { method: "POST", body: { courseId } }),

  getSavedOpportunityIds: () => request("/student/saved-opportunities"),
  saveOpportunity: (opportunityId) => request("/student/saved-opportunities", { method: "POST", body: { opportunityId } }),
  unsaveOpportunity: (opportunityId) => request(`/student/saved-opportunities/${opportunityId}`, { method: "DELETE" }),
};

// Portfolio — see backend/src/routes/portfolioRoutes.js
export const portfolioAPI = {
  getPortfolio: () => request("/portfolio"),
  saveBasics: (basics) => request("/portfolio/basics", { method: "POST", body: basics }),
  // Creates an empty portfolio_basics row for a first-time user — no fake
  // demo content, replaces the old /seed endpoint.
  init: (basics) => request("/portfolio/init", { method: "POST", body: basics ?? {} }),

  // multipart/form-data — can't go through the generic JSON request() helper.
  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${API_BASE_URL}/portfolio/avatar`, {
      method: "POST",
      headers: getMultipartHeaders(),
      credentials: "include",
      body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(data.error || "Failed to upload photo");
      err.status = response.status;
      throw err;
    }
    return data;
  },
  removeAvatar: () => request("/portfolio/avatar", { method: "DELETE" }),

  createProject: (fields) => request("/portfolio/projects", { method: "POST", body: fields }),
  updateProject: (id, fields) => request(`/portfolio/projects/${id}`, { method: "PATCH", body: fields }),
  deleteProject: (id) => request(`/portfolio/projects/${id}`, { method: "DELETE" }),

  createCertification: (fields) => request("/portfolio/certifications", { method: "POST", body: fields }),
  updateCertification: (id, fields) => request(`/portfolio/certifications/${id}`, { method: "PATCH", body: fields }),
  deleteCertification: (id) => request(`/portfolio/certifications/${id}`, { method: "DELETE" }),
  // multipart/form-data — can't go through the generic JSON request() helper.
  uploadCertificateFile: async (id, file) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${API_BASE_URL}/portfolio/certifications/${id}/file`, {
      method: "POST",
      headers: getMultipartHeaders(),
      credentials: "include",
      body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(data.error || "Failed to upload certificate file");
      err.status = response.status;
      throw err;
    }
    return data;
  },

  createInternship: (fields) => request("/portfolio/internships", { method: "POST", body: fields }),
  updateInternship: (id, fields) => request(`/portfolio/internships/${id}`, { method: "PATCH", body: fields }),
  deleteInternship: (id) => request(`/portfolio/internships/${id}`, { method: "DELETE" }),

  createAchievement: (fields) => request("/portfolio/achievements", { method: "POST", body: fields }),
  updateAchievement: (id, fields) => request(`/portfolio/achievements/${id}`, { method: "PATCH", body: fields }),
  deleteAchievement: (id) => request(`/portfolio/achievements/${id}`, { method: "DELETE" }),

  // Admin/institution review queue.
  getPendingCertifications: () => request("/portfolio/certifications/pending-review"),
  reviewCertification: (id, status) => request(`/portfolio/certifications/${id}/review`, { method: "PATCH", body: { status } }),
};

// Public portfolio — unauthenticated, backs /passport/:userId. Not using the
// generic request() helper's credentials:"include" is fine either way since
// this route ignores auth, but a separate unauthenticated fetch keeps intent
// clear and avoids sending cookies unnecessarily to a public page.
export async function getPublicPortfolio(userId) {
  const response = await fetch(`${API_BASE_URL}/portfolio/public/${userId}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.error || "Portfolio not found");
    err.status = response.status;
    throw err;
  }
  return data;
}

// Applications — see backend/src/routes/applicationsRoutes.js
export const applicationsAPI = {
  getApplications: () => request("/applications"),
  applyToOpportunity: (payload) => request("/applications", { method: "POST", body: payload }),
  // Recruiter-side: moves a REAL student application's status. Ownership is
  // enforced server-side (the application must belong to an opportunity this
  // recruiter posted), so this call fails harmlessly for anyone else's applications.
  updateApplicationStatus: (id, status) => request(`/applications/${id}/status`, { method: "PATCH", body: { status } }),
};

// Messages — see backend/src/routes/messagesRoutes.js
export const messagesAPI = {
  getConversations: () => request("/messages"),
  // Opens/returns the conversation between studentId and industryId without
  // sending a message — used by the industry Contact button and the
  // apply-triggered auto-create (server-side; not called from here).
  startConversation: (studentId, industryId, opportunityId) =>
    request("/messages/start", { method: "POST", body: { studentId, industryId, opportunityId } }),
  // Either conversationId (existing thread) or studentId+industryId (create
  // on first message) must be provided.
  sendMessage: ({ conversationId, studentId, industryId, opportunityId, text }) =>
    request("/messages/send", { method: "POST", body: { conversationId, studentId, industryId, opportunityId, text } }),
  markConversationRead: (conversationId) => request("/messages/read", { method: "POST", body: { conversationId } }),
};

// Industry — see backend/src/routes/industryRoutes.js
export const industryAPI = {
  getCompanyProfile: () => request("/industry/company-profile"),
  saveCompanyProfile: (fields) => request("/industry/company-profile", { method: "POST", body: fields }),
  uploadCompanyLogo: async (file) => {
    const formData = new FormData();
    formData.append("logo", file);
    const response = await fetch(`${API_BASE_URL}/industry/company-profile/logo`, {
      method: "POST",
      headers: getMultipartHeaders(),
      credentials: "include",
      body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Failed to upload company logo");
    return data;
  },

  getPostedOpportunities: () => request("/industry/opportunities"),
  // Scoped to the logged-in recruiter's own postings — used by Manage
  // Opportunities/the dashboard/Candidates pages, which want "MY listings",
  // not every recruiter's (that's what getPostedOpportunities is for).
  getMyOpportunities: () => request("/industry/my-opportunities"),
  createOpportunity: (fields) => request("/industry/opportunities", { method: "POST", body: fields }),
  updateOpportunityStatus: (id, status) => request(`/industry/opportunities/${id}/status`, { method: "PATCH", body: { status } }),

  // Real student applications against opportunities this recruiter posted —
  // the join the Applicant Pipeline was missing.
  getApplicationsForMyOpportunities: () => request("/industry/applications"),

  // Real applicants only (every student who applied to one of my
  // opportunities) — replaces the old fake candidate mock pool.
  getMyCandidates: () => request("/industry/candidates"),
  getCandidateProfile: (candidateId) => request(`/industry/candidates/${candidateId}`),

  getPipelineOverrides: () => request("/industry/pipeline-overrides"),
  setPipelineStage: (entryId, stage) => request("/industry/pipeline-overrides", { method: "POST", body: { entryId, stage } }),

  getAllSkillPrograms: () => request("/industry/skill-programs"),
  createSkillProgram: (payload) => request("/industry/skill-programs", { method: "POST", body: payload }),
};

export default authAPI;
