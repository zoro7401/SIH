// backend/scripts/seedAdvisorKnowledge.js
// One-time seed script for the RAG knowledge base.
// Run from the backend directory: node scripts/seedAdvisorKnowledge.js
// Re-running is safe — entries are upserted by (skill_or_role_name, category).
//
// Usage:
//   node scripts/seedAdvisorKnowledge.js          <- dry-run: shows 5 samples, asks for confirmation
//   node scripts/seedAdvisorKnowledge.js --yes    <- runs full seed without prompting

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { generateEmbedding } from "../src/utils/generateEmbedding.js";
import readline from "readline";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/rest\/v1\/?$/i, "");
const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─────────────────────────────────────────────────────────────────────────────
// KNOWLEDGE BASE ENTRIES
// 34 skill_explainers (matching SKILL_CATALOG) + 4 career_roles (matching CAREER_ROLES)
// Each entry: 100–200 words covering what it is, why it matters, and a first step.
// ─────────────────────────────────────────────────────────────────────────────
const KNOWLEDGE_ENTRIES = [
  // ── SKILL EXPLAINERS ──────────────────────────────────────────────────────
  {
    category: "skill_explainer",
    skill_or_role_name: "JavaScript",
    content:
      "JavaScript is the programming language of the web. It runs natively in every browser and, via Node.js, on the server as well. For frontend developers, it controls interactivity — animations, form validation, API calls, and dynamic content updates without page reloads. For backend developers, it enables full-stack development in a single language. JavaScript is also the foundation of frameworks like React, Vue, and Angular. Employers across software engineering, product, and fintech industries list it as a core requirement. Its event-driven, asynchronous model (promises, async/await) is widely used in modern APIs. First step: complete the freeCodeCamp JavaScript Algorithms and Data Structures certification — it takes 300 hours and covers syntax, DOM manipulation, and functional programming patterns from the ground up.",
  },
  {
    category: "skill_explainer",
    skill_or_role_name: "Python Programming",
    content:
      "Python is a high-level, readable programming language that dominates data science, machine learning, automation, and backend development. Its clean syntax makes it beginner-friendly, while powerful libraries like NumPy, pandas, scikit-learn, TensorFlow, and Django make it production-ready. Python is the default language for ML/AI roles and is increasingly common in cloud scripting, DevOps, and financial modelling. Data Analyst, ML Engineer, and Backend Engineer roles all commonly require Python. Its extensive ecosystem means nearly every problem has a well-maintained library. First step: work through the official Python tutorial at python.org to understand syntax, data types, functions, and file I/O. Then pick one domain — data analysis with pandas or web APIs with Flask — and build a small project to solidify fundamentals.",
  },
  {
    category: "skill_explainer",
    skill_or_role_name: "React",
    content:
      "React is a JavaScript library for building user interfaces, developed and maintained by Meta. It uses a component-based model where the UI is broken into reusable pieces, each managing its own state. React's virtual DOM efficiently updates only the parts of a page that change, making applications fast. It is the most in-demand frontend framework in the Indian tech industry and is required by startups and enterprises alike. Understanding React means understanding components, props, state, hooks (useState, useEffect, useContext), and the component lifecycle. Frontend Developer roles almost universally list React as required. First step: follow the official React documentation's interactive tutorial at react.dev — it teaches modern React with hooks and avoids outdated class-component patterns, taking roughly 10–15 hours to complete.",
  },
  {
    category: "skill_explainer",
    skill_or_role_name: "SQL / Databases",
    content:
      "SQL (Structured Query Language) is the standard language for querying and managing relational databases like PostgreSQL, MySQL, and SQLite. Nearly every application that stores persistent data uses SQL at some layer. Data Analysts use it to extract insights from large tables; Backend Developers use it to design schemas and write efficient queries; even ML Engineers use it to pull training data. Key concepts include SELECT statements, JOINs (inner, left, right), GROUP BY, aggregations, subqueries, indexes, and transactions. Supabase, the database used in this platform, is built on PostgreSQL — so SQL fluency directly applies. First step: complete SQLZoo or Mode SQL Tutorial (both free) — they cover all core query patterns interactively. Then practice writing JOIN-heavy queries on a real dataset.",
  },
  {
    category: "skill_explainer",
    skill_or_role_name: "Data Structures & Algorithms",
    content:
      "Data Structures and Algorithms (DSA) is the study of how to organize and process data efficiently. Arrays, linked lists, stacks, queues, trees, graphs, hashmaps — these are the building blocks. Algorithms like binary search, sorting variants, BFS/DFS, dynamic programming, and greedy methods are their operations. DSA is tested in every technical interview at top product companies (Google, Microsoft, Flipkart, Razorpay). Beyond interviews, it teaches you to reason about time and space complexity (Big-O notation), which directly impacts whether your code scales. Backend, ML, and platform engineering roles all require strong fundamentals. First step: use NeetCode.io — it provides a structured roadmap of 150 essential problems organized by pattern. Start with arrays and hashmaps before tackling trees and graphs.",
  },
  {
    category: "skill_explainer",
    skill_or_role_name: "Cloud Computing (AWS)",
    content:
      "Amazon Web Services (AWS) is the world's largest cloud platform, offering compute (EC2), storage (S3), databases (RDS, DynamoDB), serverless (Lambda), networking, and AI/ML services. Cloud Computing means deploying and managing applications on remote infrastructure rather than local servers. Cloud Engineers, DevOps Engineers, and Backend Developers all need AWS fluency. Key services to know: EC2 for virtual machines, S3 for object storage, IAM for access control, VPC for networking, RDS for managed databases, and Lambda for serverless functions. India's cloud market is growing rapidly and AWS-certified professionals command significant salary premiums. First step: create a free AWS account (free tier available) and complete the AWS Cloud Practitioner Essentials course on AWS Skill Builder — it is free and covers core concepts in roughly 6 hours.",
  },
  {
    category: "skill_explainer",
    skill_or_role_name: "Machine Learning",
    content:
      "Machine Learning is a subfield of AI where systems learn patterns from data rather than being explicitly programmed with rules. Supervised learning (classification, regression), unsupervised learning (clustering, dimensionality reduction), and reinforcement learning are the three main paradigms. Core algorithms include linear regression, decision trees, random forests, gradient boosting (XGBoost), and neural networks. The ML workflow involves data collection, cleaning, feature engineering, model training, evaluation, and deployment. ML Engineer and Data Science roles require both mathematical understanding (statistics, linear algebra, probability) and Python implementation skills (scikit-learn, TensorFlow, PyTorch). First step: complete Andrew Ng's Machine Learning Specialization on Coursera (audit for free) — it covers supervised and unsupervised learning with Python and gives a rigorous mathematical foundation.",
  },
  {
    category: "skill_explainer",
    skill_or_role_name: "Git & Version Control",
    content:
      "Git is a distributed version control system that tracks changes in source code over time. It allows multiple developers to collaborate without overwriting each other's work, enables rollback to any previous state, and is the backbone of modern software development workflows. GitHub and GitLab host Git repositories and add collaboration features like pull requests, code review, and CI/CD pipelines. Every software engineering role requires Git fluency — it is a baseline expectation, not a differentiator. Key concepts: commit, branch, merge, rebase, pull request, conflict resolution, and gitignore. First step: complete the official GitHub Skills course at skills.github.com (free) — the Introduction to GitHub course takes under 1 hour and gives hands-on practice with real repositories. Then practice branching and pull requests on your own projects.",
  },
  {
    category: "skill_explainer",
    skill_or_role_name: "Communication",
    content:
      "Communication is the ability to convey ideas clearly and effectively across written, verbal, and presentation formats. In tech roles, this means writing clear technical documentation, explaining complex systems to non-technical stakeholders, participating confidently in stand-ups, and producing readable code comments and commit messages. Strong communicators get their ideas implemented faster, receive better performance reviews, and advance into senior and leadership roles more quickly than equally technical peers who struggle to articulate their work. Soft skills like communication are explicitly listed in most job descriptions at product companies and consultancies. First step: join Toastmasters or a college speaking club for verbal practice. For written communication, start writing a technical blog — even one post per month about something you learned — to develop the habit of explaining ideas clearly.",
  },
  {
    category: "skill_explainer",
    skill_or_role_name: "Teamwork",
    content:
      "Teamwork is the ability to collaborate effectively with others toward a shared goal — including sharing credit, giving and receiving constructive feedback, resolving conflicts professionally, and adapting your working style to teammates. In software development, teams ship products together: no individual owns the entire system. Agile/Scrum workflows depend on team rituals like daily stand-ups, sprint planning, and retrospectives. Employers consistently rank teamwork among the top hiring criteria alongside technical skills. Students who have worked on group projects, hackathons, or open-source contributions can demonstrate this concretely. First step: contribute to a real open-source project on GitHub — even fixing a documentation error or a small bug counts. This forces you to communicate with maintainers, follow contribution guidelines, and collaborate asynchronously.",
  },
  {
    category: "skill_explainer",
    skill_or_role_name: "Problem Solving",
    content:
      "Problem Solving is the ability to break down a complex, ambiguous problem into smaller pieces, identify the root cause, generate candidate solutions, evaluate trade-offs, and implement the best approach. In software engineering, this manifests as debugging, designing systems under constraints, and handling edge cases. In data roles, it means figuring out why a metric moved unexpectedly. Interviewers test problem solving via algorithmic challenges, system design, and case questions. Strong problem solvers don't panic when they don't immediately know the answer — they have a reliable process. First step: practice structured problem solving with the \"Think Aloud\" method — when working through any coding or analysis problem, narrate your reasoning step by step. This builds the habit of decomposing problems systematically rather than jumping to code immediately.",
  },
  {
    category: "skill_explainer",
    skill_or_role_name: "Time Management",
    content:
      "Time Management is the ability to plan, prioritize, and execute tasks efficiently — especially under competing deadlines and shifting priorities. For students, this means balancing coursework, skill development, internship applications, and personal projects without burning out. For professionals, it means consistently delivering work on time, estimating effort accurately, and saying no to low-priority requests. Poor time management is one of the top reasons early-career professionals struggle to grow. Techniques like time-blocking, the Pomodoro technique, and weekly reviews are practical tools. First step: spend one week tracking how you actually spend your time hour-by-hour (use any calendar or a simple spreadsheet). Most people discover that 2–3 hours per day disappear to passive scrolling — reclaiming those hours is the fastest way to create meaningful study and project time.",
  },
  {
    category: "skill_explainer",
    skill_or_role_name: "Power BI",
    content:
      "Power BI is Microsoft's business intelligence and data visualization platform. It connects to data sources (Excel, SQL databases, cloud services), transforms data with Power Query, creates interactive dashboards, and shares reports across an organization. Data Analysts use Power BI to turn raw business data into visual insights that non-technical stakeholders can act on. It is widely used across banking, retail, manufacturing, and consulting in India. Key concepts: data modeling, DAX (Data Analysis Expressions) formulas, relationships between tables, and publishing to the Power BI service. First step: download Power BI Desktop (free) and complete Microsoft's free \"Power BI for Beginners\" learning path on Microsoft Learn — it walks through loading a dataset, building visuals, and creating a simple dashboard in about 4 hours.",
  },
  {
    category: "skill_explainer",
    skill_or_role_name: "Statistics",
    content:
      "Statistics is the mathematical discipline for collecting, analyzing, interpreting, and presenting data. For Data Analysts and ML Engineers, it is foundational — you cannot draw valid conclusions from data without understanding probability distributions, hypothesis testing, confidence intervals, correlation vs. causation, and regression. Descriptive statistics summarize data; inferential statistics draw conclusions about populations from samples. Common tests include t-tests, chi-square tests, and ANOVA. Python libraries (scipy, statsmodels) and R are standard tools. Without statistical literacy, ML models are often misused — overfitting, data leakage, and flawed A/B tests are all statistical errors. First step: work through Khan Academy's Statistics and Probability course (free) — it covers all core concepts visually before introducing mathematical notation, making it accessible even without a strong math background.",
  },
  {
    category: "skill_explainer",
    skill_or_role_name: "Excel",
    content:
      "Microsoft Excel remains one of the most widely used data tools in the world — particularly in business, finance, operations, and early-stage data analysis. Data Analysts frequently start with Excel before graduating to SQL or Python. Core skills include VLOOKUP/XLOOKUP, pivot tables, conditional formatting, data validation, charts, and basic macros. Excel is especially valued in non-tech-first industries (banking, consulting, FMCG) where large Python stacks are impractical. Even in tech companies, Excel is used for ad hoc analysis, stakeholder reporting, and financial modelling. First step: complete the free ExcelJet tutorial at exceljet.net — it covers all essential functions with real examples. Then practice by downloading a public dataset (e.g., from Kaggle) and building a pivot table analysis and chart from scratch.",
  },
  {
    category: "skill_explainer",
    skill_or_role_name: "TypeScript",
    content:
      "TypeScript is a statically typed superset of JavaScript developed by Microsoft. It adds type annotations to JavaScript, catching type errors at compile time rather than at runtime. This makes large codebases significantly safer to maintain — refactoring is less dangerous, IDE autocomplete is more accurate, and bugs surface earlier. Most large frontend and Node.js codebases have migrated to TypeScript, and it is now the default at major tech companies. Frontend Developer and Backend Node.js roles increasingly list TypeScript as required rather than optional. First step: read the TypeScript Handbook at typescriptlang.org — it is free and comprehensive. The key insight is that valid JavaScript is already valid TypeScript, so you start by adding types gradually to existing code rather than rewriting everything at once.",
  },
  {
    category: "skill_explainer",
    skill_or_role_name: "Java / C++ / C#",
    content:
      "Java, C++, and C# are statically typed, object-oriented languages used in enterprise software, game development, competitive programming, and systems engineering. Java dominates enterprise backend (Spring Boot), Android development, and financial systems. C++ is used in systems programming, game engines (Unreal), high-frequency trading, and embedded systems where performance is critical. C# is Microsoft's language for .NET backend services and Unity game development. All three are common in interview tests for backend and platform roles. Core concepts across all three: OOP (classes, inheritance, polymorphism), memory management (especially in C++), generics, concurrency, and design patterns. First step: pick one based on your target role. For backend/enterprise, start with Java via NPTEL's free Java course. For competitive programming, C++ is standard — pick up Competitive Programming 3 by Steven Halim.",
  },
  {
    category: "skill_explainer",
    skill_or_role_name: "Node.js",
    content:
      "Node.js is a JavaScript runtime built on Chrome's V8 engine that lets JavaScript run on the server side. It uses a non-blocking, event-driven I/O model that makes it highly efficient for API servers, real-time applications (chat, live dashboards), and microservices. Node.js, combined with Express.js or Fastify, is one of the most common stacks for building REST APIs in startups. Full-stack JavaScript — React on the frontend, Node.js on the backend — is a highly employable combination. This project's backend is built with Node.js and Express. Key concepts: event loop, asynchronous programming (callbacks, promises, async/await), npm ecosystem, and building REST APIs with Express. First step: build a simple CRUD API with Express.js and connect it to a PostgreSQL database — Node.js By Example on freeCodeCamp's YouTube channel covers this in under 3 hours.",
  },
  {
    category: "skill_explainer",
    skill_or_role_name: "Docker / Kubernetes",
    content:
      "Docker is a containerization platform that packages an application and all its dependencies into a portable, isolated container — eliminating \"works on my machine\" problems. Kubernetes (K8s) is a container orchestration system that manages running, scaling, and healing containers across a cluster of servers. Together, they are the backbone of modern DevOps and cloud-native deployments. Cloud Engineers and DevOps Engineers use them daily; Backend Engineers need at least enough Docker knowledge to build and deploy their services. Key Docker concepts: Dockerfile, images, containers, volumes, networks. Key Kubernetes concepts: pods, deployments, services, and ingress. First step: install Docker Desktop (free) and complete the official Docker Getting Started tutorial — it takes about 2 hours and teaches building, running, and composing containers with a real application.",
  },
  {
    category: "skill_explainer",
    skill_or_role_name: "CI/CD (Jenkins, GitHub Actions)",
    content:
      "CI/CD stands for Continuous Integration and Continuous Deployment. CI means automatically running tests every time code is committed, catching broken builds immediately. CD means automatically deploying passing builds to staging or production — no manual deployment steps. GitHub Actions is the most accessible CI/CD tool for open-source and small-to-medium projects; Jenkins is common in larger enterprises. CI/CD is a core DevOps practice that dramatically reduces release risk and shortens deployment cycles. Cloud and DevOps engineer roles list it as essential. Key concepts: pipeline configuration (YAML), triggers (on push/PR), test runners, artifact storage, and deployment steps. First step: add a basic GitHub Actions workflow to any existing project — the GitHub Actions documentation provides a Hello World workflow that takes 30 minutes to set up and teaches the core concepts immediately.",
  },
  {
    category: "skill_explainer",
    skill_or_role_name: "REST APIs / GraphQL",
    content:
      "REST (Representational State Transfer) is an architectural style for building web APIs using HTTP methods (GET, POST, PUT, DELETE) and URL-based resources. GraphQL is an alternative query language for APIs that lets clients request exactly the data they need in one request. REST APIs are universal — virtually every web service exposes one. GraphQL is common in product companies with complex data needs (GitHub, Shopify, Swiggy). Backend Developers design and build APIs; Frontend Developers consume them. Key REST concepts: endpoints, HTTP status codes, request/response bodies (JSON), authentication (JWT, OAuth), and idempotency. First step: build your own REST API with Node.js + Express or Python + FastAPI, then document it with Swagger/OpenAPI. Using tools like Postman or Hoppscotch to test APIs interactively accelerates learning significantly.",
  },
  {
    category: "skill_explainer",
    skill_or_role_name: "Deep Learning / NLP",
    content:
      "Deep Learning is a subfield of Machine Learning that uses neural networks with many layers to learn complex patterns from large datasets — powering image recognition, speech synthesis, language models, and recommendation systems. NLP (Natural Language Processing) applies deep learning specifically to text: sentiment analysis, named entity recognition, machine translation, and large language models (LLMs) like GPT. This is the fastest-growing area in tech and the backbone of AI products. Key frameworks: TensorFlow and PyTorch. Key concepts: neural network architecture, backpropagation, transformers, attention mechanisms, embeddings, and fine-tuning. First step: complete fast.ai's Practical Deep Learning for Coders course (free at fast.ai) — it uses a top-down approach, getting you running models on real data in the first session before introducing theory, which keeps motivation high.",
  },
  {
    category: "skill_explainer",
    skill_or_role_name: "Data Visualization (Tableau)",
    content:
      "Data Visualization is the practice of representing data graphically to communicate patterns, trends, and outliers clearly to both technical and non-technical audiences. Tableau is the leading enterprise data visualization tool — drag-and-drop dashboards connect to virtually any data source. Beyond Tableau, Python libraries like Matplotlib, Seaborn, and Plotly are common for programmatic visualization. Good visualizations drive decisions; poor ones mislead. Data Analyst roles at consulting firms, e-commerce companies, and financial institutions commonly require Tableau. Key concepts: chart type selection (when to use bar vs. line vs. scatter), color theory, dashboard layout, and filtering/drill-down interactivity. First step: download Tableau Public (free) and complete Tableau's own free training videos — the \"Get Started\" series takes 6 hours and walks you through building an interactive dashboard with a real dataset.",
  },
  {
    category: "skill_explainer",
    skill_or_role_name: "Linux / Shell Scripting",
    content:
      "Linux is the operating system that powers virtually all production web servers, cloud instances, and DevOps toolchains. Shell Scripting (Bash) automates repetitive system tasks — file management, log processing, deployment steps, and environment setup. Cloud Engineers, DevOps Engineers, Backend Developers, and ML Engineers all need Linux fluency. Key concepts: file system navigation, permissions (chmod/chown), process management (ps, kill), package management (apt/yum), SSH, piping and redirection, and writing Bash scripts with variables, loops, and conditionals. First step: install WSL2 (Windows Subsystem for Linux) on Windows — it gives you a full Ubuntu environment inside Windows. Then complete The Odin Project's Command Line Basics section (free) — it covers all essential commands and scripting patterns with real exercises.",
  },
  {
    category: "skill_explainer",
    skill_or_role_name: "Cybersecurity Basics",
    content:
      "Cybersecurity is the practice of protecting systems, networks, and data from unauthorized access, theft, and damage. For software developers, security basics mean writing code that is resistant to common vulnerabilities: SQL injection, cross-site scripting (XSS), cross-site request forgery (CSRF), insecure direct object references, and broken authentication. The OWASP Top 10 is the canonical list of the most critical web application security risks. Security awareness is increasingly required across all engineering roles, not just dedicated security roles. Cloud infrastructure security (IAM policies, encryption at rest and in transit, secrets management) is also essential for Cloud Engineers. First step: read the OWASP Top 10 (free at owasp.org) and then practice by setting up a deliberately vulnerable application like DVWA (Damn Vulnerable Web Application) locally to experience these vulnerabilities hands-on.",
  },
  {
    category: "skill_explainer",
    skill_or_role_name: "Testing / QA (Selenium, Jest)",
    content:
      "Software Testing is the practice of verifying that code behaves as expected — and failing gracefully when it doesn't. Unit tests verify individual functions, integration tests verify component interactions, and end-to-end tests verify full user flows. Jest is the standard JavaScript unit testing framework (used widely with React). Selenium automates browser interactions for end-to-end testing of web applications. QA Engineers specialize in testing; developers are expected to write unit and integration tests for their own code. Test coverage is a hiring signal at product companies. Key concepts: test isolation, mocking, assertions, test runners, and CI integration. First step: add Jest to any existing JavaScript project and write unit tests for three functions. The Jest documentation's Getting Started guide takes under 1 hour and immediately builds the habit of test-driven development.",
  },
  {
    category: "skill_explainer",
    skill_or_role_name: "Mobile Development (iOS/Android, Flutter, React Native)",
    content:
      "Mobile Development is the practice of building applications for smartphones and tablets. Native development uses platform-specific languages: Swift/Objective-C for iOS, Kotlin/Java for Android. Cross-platform frameworks allow a single codebase to target both platforms: Flutter (Dart language, built by Google) and React Native (JavaScript, built by Meta) are the most popular. In India, the mobile-first internet means mobile engineering skills are extremely in demand. Flutter has rapidly grown to be the most popular cross-platform framework due to its performance and rich widget library. First step: install Flutter (free at flutter.dev), complete the official Codelab \"Write your first Flutter app\" — it takes about 2 hours and produces a working app that runs on both Android and iOS from a single Dart codebase.",
  },
  {
    category: "skill_explainer",
    skill_or_role_name: "DevOps",
    content:
      "DevOps is a cultural and technical practice that unifies software development (Dev) and IT operations (Ops) to shorten development cycles and deliver reliable software continuously. DevOps engineers build and maintain the infrastructure, automation, and tooling that teams use to develop, test, and deploy software — CI/CD pipelines, container orchestration, monitoring, alerting, and incident response. Key tools: Docker, Kubernetes, Terraform, Ansible, Prometheus, Grafana, and cloud platforms (AWS, GCP, Azure). DevOps is one of the highest-paying engineering specializations in India with significant demand from startups and enterprises alike. First step: complete the DevOps roadmap at roadmap.sh/devops — it is a free, structured learning path that organizes all the concepts and tools in the right sequence, with links to free resources for each topic.",
  },
  {
    category: "skill_explainer",
    skill_or_role_name: "Big Data (Hadoop, Spark)",
    content:
      "Big Data technologies are tools designed to process datasets too large to fit on a single machine — typically at the scale of terabytes or petabytes. Apache Hadoop provides distributed storage (HDFS) and batch processing (MapReduce). Apache Spark is the modern successor — much faster due to in-memory processing — and supports batch, streaming, SQL, ML, and graph workloads. Data Engineers and ML Engineers at large companies (e-commerce, telecom, fintech) use Spark daily. PySpark (Python API for Spark) is the most common interface. Key concepts: partitioning, distributed computation, RDDs, DataFrames, shuffling, and cluster resource management (YARN, Kubernetes). First step: run PySpark locally via Docker (no cluster needed) and complete the free Databricks Community Edition tutorials — Databricks provides a managed Spark environment with guided notebooks that introduce Spark SQL and ML in a few hours.",
  },
  {
    category: "skill_explainer",
    skill_or_role_name: "Blockchain",
    content:
      "Blockchain is a distributed ledger technology where records are cryptographically linked and stored across a decentralized network — making tampering computationally infeasible. Ethereum is the most popular programmable blockchain; smart contracts are self-executing programs that run on it, written in Solidity. Blockchain is used in DeFi (decentralized finance), supply chain tracking, digital identity, and NFT marketplaces. While the hype has moderated, technical blockchain skills (Solidity, Web3.js, Hardhat, smart contract auditing) remain in demand at crypto-native companies and fintech. First step: complete CryptoZombies (cryptozombies.io) — it is a free, game-based Solidity tutorial that teaches smart contract development interactively, taking about 8 hours to complete the core lessons. This gives you a working smart contract and a foundation for further development.",
  },

  // ── CAREER ROLES ──────────────────────────────────────────────────────────
  {
    category: "career_role",
    skill_or_role_name: "Data Analyst",
    content:
      "A Data Analyst turns raw data into actionable business insights. Day-to-day, they write SQL queries to extract data from relational databases, build dashboards in tools like Power BI or Tableau, run statistical analyses to identify trends, and present findings to business stakeholders in clear, non-technical language. They answer questions like: Which product region is underperforming? What is driving customer churn? Are this quarter's sales figures above forecast? Required skills typically include SQL/Databases (for extraction), Python or Excel (for analysis and automation), Power BI or Tableau (for visualization), and Statistics (for valid inference). A Data Analyst must be equally comfortable with data pipelines and boardroom presentations. Entry path: intern as a business or data analyst, contribute to analytics projects in college (competitions, clubs), or build a public portfolio of SQL + visualization projects on GitHub. Roles are available across banking, e-commerce, healthcare, consulting, and SaaS companies.",
  },
  {
    category: "career_role",
    skill_or_role_name: "Frontend Developer",
    content:
      "A Frontend Developer builds the visual layer of web applications — everything a user sees and interacts with in the browser. Day-to-day responsibilities include building UI components (buttons, forms, dashboards, modals), wiring them to backend APIs, ensuring responsive design across screen sizes, optimizing page performance, and collaborating with designers to implement pixel-accurate interfaces. JavaScript fluency is essential; React is the most in-demand framework. Problem Solving and Git & Version Control are baseline requirements for collaborative engineering work. Modern Frontend Developers also understand accessibility (WCAG), basic SEO, and web performance (Core Web Vitals). Entry path: build 2–3 portfolio projects (a portfolio site, a weather app, a full CRUD app), contribute to open-source React projects, and apply for frontend or full-stack internships. The role exists at every company with a web presence — from startups to enterprises to government portals.",
  },
  {
    category: "career_role",
    skill_or_role_name: "Cloud Engineer",
    content:
      "A Cloud Engineer designs, builds, and maintains the cloud infrastructure that applications run on. Day-to-day, they provision virtual machines and databases, write Infrastructure-as-Code (Terraform, CloudFormation), build and manage CI/CD pipelines, configure networking (VPCs, load balancers, DNS), set up monitoring and alerting, and respond to incidents. They work closely with both development and operations teams. AWS is the dominant platform; Azure and GCP are also common. Required skills include Cloud Computing (AWS), Git & Version Control for infrastructure code, Python for scripting and automation, and strong Problem Solving for debugging distributed systems. Entry path: earn the AWS Cloud Practitioner certification (beginner-level, free study materials available), then the AWS Solutions Architect Associate. Build lab projects on the AWS free tier — host a static site on S3, deploy a backend on EC2, create a serverless function with Lambda. Cloud Engineering is one of the highest-demand and highest-paying technical roles in India.",
  },
  {
    category: "career_role",
    skill_or_role_name: "Machine Learning Engineer",
    content:
      "A Machine Learning Engineer designs, trains, evaluates, and deploys ML models at production scale. Unlike a Data Scientist who focuses on research and exploration, an ML Engineer focuses on productionizing models — wrapping them in APIs, optimizing inference latency, monitoring for data drift, and maintaining training pipelines. Day-to-day tasks include cleaning and transforming datasets, selecting and tuning model architectures, evaluating performance metrics (precision, recall, AUC), building data pipelines, and deploying models to cloud infrastructure. Required skills: Python Programming (foundation of every ML library), Machine Learning fundamentals (scikit-learn, gradient boosting, neural networks), Data Structures & Algorithms (for efficient pipelines), and Statistics (for valid model evaluation). Entry path: complete an end-to-end ML project — pick a real problem, source data, clean it, train multiple models, evaluate them rigorously, and deploy the best one as a public API. Document everything on GitHub. ML Engineer roles are available at AI startups, tech giants, and increasingly at traditional companies with data teams.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const skipConfirm = process.argv.includes("--yes");

  console.log("\n========================================");
  console.log(" AI Advisor Knowledge Base Seeder");
  console.log(`  Total entries to seed: ${KNOWLEDGE_ENTRIES.length}`);
  console.log("========================================\n");

  // ── STEP 3 APPROVAL GATE: show 5 sample entries ───────────────────────────
  console.log("SAMPLE ENTRIES (5 of 38) — review before seeding:\n");
  const samples = [
    KNOWLEDGE_ENTRIES[0],  // JavaScript
    KNOWLEDGE_ENTRIES[6],  // Machine Learning
    KNOWLEDGE_ENTRIES[12], // Power BI
    KNOWLEDGE_ENTRIES[30], // Data Analyst (career_role)
    KNOWLEDGE_ENTRIES[33], // Machine Learning Engineer (career_role)
  ];

  for (const s of samples) {
    console.log(`[${s.category.toUpperCase()}] ${s.skill_or_role_name}`);
    console.log(s.content.slice(0, 200) + "...\n");
  }

  if (!skipConfirm) {
    const answer = await confirm(
      "Proceed with seeding all 38 entries? (yes/no): "
    );
    if (answer !== "yes" && answer !== "y") {
      console.log("Seeding cancelled.");
      process.exit(0);
    }
  }

  // ── SEED ──────────────────────────────────────────────────────────────────
  console.log("\nGenerating embeddings and seeding...\n");
  let success = 0;
  let failed = 0;

  for (let i = 0; i < KNOWLEDGE_ENTRIES.length; i++) {
    const entry = KNOWLEDGE_ENTRIES[i];
    const label = `[${i + 1}/${KNOWLEDGE_ENTRIES.length}] ${entry.skill_or_role_name}`;

    try {
      const embedding = await generateEmbedding(entry.content);

      const { error } = await supabase.from("advisor_knowledge_base").upsert(
        {
          category: entry.category,
          skill_or_role_name: entry.skill_or_role_name,
          content: entry.content,
          embedding,
        },
        { onConflict: "skill_or_role_name,category" }
      );

      if (error) throw error;

      console.log(`  OK  ${label}`);
      success++;

      // Throttle: stay well under Gemini embedding API rate limits
      if (i < KNOWLEDGE_ENTRIES.length - 1) await sleep(300);
    } catch (err) {
      console.error(`  ERR ${label}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n========================================`);
  console.log(` Seed complete: ${success} OK, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
