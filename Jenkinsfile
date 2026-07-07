pipeline {
    agent any

    environment {
        // The name of the image we will build and scan
        IMAGE_NAME = "juice-shop-vulnerable"
        // The URL where the test environment for DAST will be running
        APP_URL = "http://localhost:3000" 
    }

    stages {
        stage('1. Secret Scanning: Gitleaks') {
            steps {
                echo 'Running Gitleaks to find hardcoded secrets...'
                // Run Gitleaks via Docker, scanning the current directory
                sh 'docker run -v ${WORKSPACE}:/path zricethezav/gitleaks:latest detect --source="/path" -v || echo "Vulnerabilities found! (Proceeding for demo purposes)"'
            }
        }

        stage('2. SAST: SonarQube') {
            steps {
                echo 'Running SonarQube Static Application Security Testing...'
                // Note: A real SonarQube server is required for an actual run. 
                // This shows the command for the SonarScanner CLI.
                sh '''
                    docker run --rm -e SONAR_HOST_URL="http://your-sonarqube-server:9000" \
                    -e SONAR_LOGIN="your-sonar-token" \
                    -v "${WORKSPACE}:/usr/src" \
                    sonarsource/sonar-scanner-cli || echo "SAST issues found! (Proceeding for demo purposes)"
                '''
            }
        }

        stage('3. IaC Scanning: Checkov') {
            steps {
                echo 'Scanning Kubernetes manifests with Checkov...'
                // Scan the deployment.yaml file
                sh 'docker run --rm -v ${WORKSPACE}:/work bridgecrew/checkov -f /work/deployment.yaml || echo "Misconfigurations found! (Proceeding for demo purposes)"'
            }
        }

        stage('Build Image') {
            steps {
                echo 'Building the application Docker image...'
                sh 'docker build -t ${IMAGE_NAME}:latest .'
            }
        }

        stage('4. Container Scanning: Trivy') {
            steps {
                echo 'Scanning the Docker image with Trivy...'
                sh 'docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image ${IMAGE_NAME}:latest || echo "Critical vulnerabilities found in the image! (Proceeding for demo purposes)"'
            }
        }

        stage('Deploy to Staging (for DAST)') {
            steps {
                echo 'Deploying the application for dynamic testing...'
                // Run the container on port 3000
                sh 'docker run -d -p 3000:3000 --name juice-shop-demo ${IMAGE_NAME}:latest'
                // Wait a few seconds to ensure the application starts properly
                sleep 15
            }
        }

        stage('5. DAST: OWASP ZAP') {
            steps {
                echo 'Running OWASP ZAP dynamic scanning...'
                // Run Baseline Scan against the deployed container
                sh 'docker run -t owasp/zap2docker-stable zap-baseline.py -t ${APP_URL} || echo "Vulnerabilities found in the running application!"'
            }
        }
    }

    post {
        always {
            echo 'Cleaning up the environment after the demo...'
            // Stop and remove the test container
            sh 'docker stop juice-shop-demo || true'
            sh 'docker rm juice-shop-demo || true'
        }
    }
}