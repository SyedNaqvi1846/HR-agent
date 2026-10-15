export const HIRING_POLICY = `
Full Stack Engineer:

A Full Stack Engineer is a seasoned professional responsible for architecting and building complete applications with engineering rigor. They fit within the organization as key technical leaders, collaborating closely with product and design teams, platform teams, and DevOps. Their responsibilities include making technical decisions, establishing best practices, and mentoring others, all while ensuring the delivery of robust and scalable software.

Responsibilities & Duties of a Full Stack Engineer:
1. Architecting Full-Stack Application Systems:
Design robust system architectures that support scalable and maintainable applications, balancing performance, concurrency, and modularity.

2. Designing and Implementing APIs and Services:
Design and implement resilient RESTful or GraphQL APIs with end-to-end security, rate limiting, and clear contracts.

3. Building Scalable Frontend Applications:
Build responsive, accessible, and performant user interfaces with modern frameworks like React and TypeScript.

4. Establishing Engineering Standards:
Set and maintain code standards, comprehensive automated testing, and CI/CD quality gates.

5. Leading Technical Decisions:
Make critical architectural trade-offs, choosing appropriate datastores, concurrency models, and cloud infrastructure.

6. Mentoring Team Members:
Conduct rigorous code reviews, guide junior engineers, and promote engineering best practices.

7. Optimizing Database Performance:
Optimize database schemas, indexes, query plans, caching strategies, and transaction isolation.

8. Configuring Cloud Infrastructure:
Configure containerized cloud architectures (Docker, Kubernetes, AWS/GCP), CI/CD pipelines, and observability.

Required Skills & Benchmarks:
- Proficiency across backend and frontend stacks
- Deep system architecture and concurrency knowledge
- Database tuning, indexing, and transactional integrity
- Problem-solving under production failure scenarios
`;

export const DEMO_CANDIDATES = [
  {
    id: "alice_smith",
    name: "Alice Smith",
    fileName: "alice_smith.docx",
    email: "alice.smith@example.com",
    role: "Python Developer",
    resumeText: `Alice Smith
Email: alice.smith@example.com | Phone: (555) 123-4567 | San Francisco, CA

Professional Summary:
Experienced Software Engineer with over 4 years of hands-on experience building backend APIs, microservices, and data pipelines using Python, SQL, and FastAPI. Passionate about system performance, asynchronous programming, and automated testing.

Technical Skills:
- Languages: Python 3.12, SQL, JavaScript
- Frameworks & Libraries: FastAPI, Flask, SQLAlchemy, Pydantic, Pytest, Celery
- Databases: PostgreSQL, Redis
- Infrastructure & Tools: Docker, Git, Linux, GitHub Actions, AWS (EC2, S3)

Work Experience:
Senior Backend Engineer | CloudScale Inc. (2022 - Present)
- Designed and built high-throughput asynchronous microservices handling 12,000 requests/minute using FastAPI and Redis cache.
- Redesigned PostgreSQL database indexing, cutting p95 query latency by 45%.
- Implemented comprehensive test suites in Pytest maintaining 92% code coverage.

Software Engineer | DevWorks (2020 - 2022)
- Built customer-facing REST APIs and background worker tasks with Celery.
- Maintained Docker deployment pipelines with GitHub Actions.

Education:
B.S. in Computer Science | University of California, Berkeley`
  },
  {
    id: "bob_jones",
    name: "Bob Jones",
    fileName: "bob_jones.docx",
    email: "bob.jones@example.com",
    role: "Full-Stack Engineer",
    resumeText: `Bob Jones
Email: bob.jones@example.com | Phone: (555) 987-6543 | New York, NY

Professional Summary:
Full-Stack Engineer with 3+ years of experience architecting end-to-end web applications with React, TypeScript, Node.js, and PostgreSQL. Focused on clean component architectures, robust API security, and scalable distributed state.

Technical Skills:
- Frontend: React 19, TypeScript, Next.js, Tailwind CSS, Redux Toolkit
- Backend: Node.js, Express, NestJS, GraphQL, REST APIs
- Databases & DevOps: PostgreSQL, Prisma ORM, Redis, Docker, Git

Work Experience:
Full-Stack Developer | Nexus Interactive (2022 - Present)
- Architected enterprise React dashboard with Next.js App Router and TypeScript.
- Developed real-time WebSocket notifications and GraphQL endpoints.
- Optimized frontend bundle sizes reducing initial load by 35%.

Junior Web Developer | InnovateSoft (2021 - 2022)
- Implemented responsive UI components and integrated third-party payment gateways.
- Collaborated in agile sprints with UX designers and backend teams.

Education:
B.S. in Software Engineering | New York University`
  }
];
