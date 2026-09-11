# Technical Specification & System Deployment Guide

**Project Name:** Agivant — Proctored Technical Recruitment & Assessment Platform  
**Document Type:** System Requirements & Deployment Specification  
**Version:** 1.0  
**Target Environment:** Local Workstation / Staging Server Deployment  

---

## 1. Executive Summary

**Agivant** is an enterprise-grade proctored technical recruitment and assessment platform comprising four integrated core modules:
1. **Core Backend Service:** A Java / Spring Boot 3 enterprise application managing authentication, assessment authoring, candidate management, exam scheduling, scoring, and proctoring audit logs.
2. **Frontend Client Portal:** A modern React / Vite Single Page Application (SPA) providing dedicated portals for Administrators and Candidates with integrated code editing (Monaco Editor) and audio/video proctoring.
3. **AI Vision Proctoring Microservice:** A Python / FastAPI service leveraging OpenCV and MediaPipe for real-time facial landmark tracking, eye-gaze tracking, multiple-face detection, and suspicious activity analysis.
4. **Sandboxed Code Execution Engine:** An automated multi-language runtime (`Java`, `Python`, `C++`, `JavaScript`) with timeout watchdogs and automated test-case evaluation.

---

## 2. Software & Runtime Prerequisites

To set up and run this application on any target workstation or laptop, the following software packages must be installed:

### 2.1 Core System Requirements

| Category | Component / Software | Required Version | Purpose / Scope |
| :--- | :--- | :--- | :--- |
| **Backend Runtime** | **Java Development Kit (JDK)** | **Java 21** *(or Java 17+)* | Compiles and executes the Spring Boot 3.3.4 application. |
| **Backend Build Tool** | **Apache Maven** | **3.8.x or 3.9.x** | Manages Java dependencies, project build, and test lifecycle. |
| **Database Server** | **MySQL Server** | **8.0+** | Relational data store for users, questions, assignments, and audit trails. |
| **Frontend Runtime** | **Node.js** | **v18.x / v20.x+ (LTS)** | JavaScript runtime executing Vite and bundling React assets. |
| **Package Manager** | **npm** | **v9.x / v10.x+** | Manages frontend packages and client dependencies. |
| **AI Vision Service** | **Python** | **3.10.x or 3.11.x** | Executes the computer vision proctoring microservice. |
| **Python Installer** | **pip** | **23.x+** | Manages Python packages (OpenCV, MediaPipe, FastAPI). |

---

### 2.2 Optional Compilers (For Online Coding Assessment Sandbox)

If candidates are required to solve live coding challenges, ensure the following compilers/interpreters are registered in the system `PATH`:

* **Java:** Included with JDK (`javac` and `java`).
* **Python:** Included with Python 3 (`python`).
* **C++:** GCC / MinGW-w64 (`g++`).
* **JavaScript:** Included with Node.js (`node`).

---

## 3. Client Hardware & Browser Requirements

For candidates taking proctored examinations:
* **Web Camera:** Standard integrated or USB webcam (minimum 720p recommended).
* **Microphone:** Integrated or external microphone (for ambient sound and speech detection).
* **Supported Browsers:** Google Chrome (v110+), Microsoft Edge (v110+), or Mozilla Firefox (v115+).
* **Permissions Required:** Browser permissions for Camera, Microphone, and Fullscreen access.

---

## 4. Environment & Database Configuration

The backend connects to MySQL using settings defined in `backend/src/main/resources/application.properties`.

### Default Database Parameters:
* **Host:** `localhost`
* **Port:** `3306`
* **Database Name:** `recruitment_db` *(Automatically created on first startup if user permissions allow)*
* **Connection String:** `jdbc:mysql://localhost:3306/recruitment_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC&createDatabaseIfNotExist=true`

### Configuration Adjustments:
Update the database credentials in `backend/src/main/resources/application.properties` or set them via system environment variables:
```properties
spring.datasource.username=root
spring.datasource.password=your_mysql_password
```

---

## 5. Step-by-Step Deployment & Launch Procedure

To run the platform locally, open three separate terminal windows and execute the following commands:

### Terminal 1: AI Vision Proctoring Microservice
```bash
# 1. Navigate to the proctoring service directory
cd proctoring-service

# 2. Create and activate a dedicated virtual environment
python -m venv venv

# Windows:
.\venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

# 3. Install required Python packages
pip install -r requirements.txt

# 4. Start the FastAPI ASGI server on port 8000
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

### Terminal 2: Spring Boot Backend Application
```bash
# 1. Navigate to the backend directory
cd backend

# 2. Build and launch the Spring Boot service on port 8080
mvn spring-boot:run
```
*(On the first run, the system automatically initializes the database schema, default security roles, questions, and the root administrator account).*

---

### Terminal 3: React Frontend Client
```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Launch the Vite development server on port 5173
npm run dev
```

---

## 6. Service Endpoints & Initial Credentials

| Service | Protocol / Port | Access URL |
| :--- | :--- | :--- |
| **Web Portal (UI)** | HTTP : `5173` | [http://localhost:5173](http://localhost:5173) |
| **REST API Server** | HTTP : `8080` | [http://localhost:8080/api](http://localhost:8080/api) |
| **AI Proctoring API** | HTTP : `8000` | [http://localhost:8000](http://localhost:8000) |
| **Database Server** | MySQL : `3306` | `localhost:3306/recruitment_db` |

### Default Administrative Credentials:
* **Role:** System Administrator (`ROLE_ADMIN`)
* **Username / Email:** `admin` or `admin@recruitment.corp`
* **Password:** `admin123` *(or `Admin@123`)*
