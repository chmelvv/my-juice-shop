pipeline {
    agent {
        kubernetes {
            yaml '''
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: jnlp
    image: jenkins/inbound-agent:jdk21
  - name: gitleaks
    image: zricethezav/gitleaks:latest
    command: ["cat"]
    tty: true
  - name: checkov
    image: bridgecrew/checkov:latest
    command: ["cat"]
    tty: true
  - name: trivy
    image: aquasec/trivy:latest
    command: ["cat"]
    tty: true
  - name: kubectl
    image: bitnami/kubectl:latest
    command: ["cat"]
    tty: true
  - name: zap
    image: zaproxy/zap-stable:latest
    command: ["cat"]
    tty: true
    user: root # ZAP needs root privileges to write the HTML report to the Jenkins workspace
'''
        }
    }

    environment {
        // Using the official, pre-built vulnerable Juice Shop image to save time
        REGISTRY_IMAGE = "bkimminich/juice-shop"
        IMAGE_TAG = "latest"
        
        // Internal Kubernetes DNS address for ZAP DAST scanning
        APP_URL = "http://juice-shop-service:3000" 
    }

    stages {
        stage('1. Secret Scanning: Gitleaks') {
            steps {
                container('gitleaks') {
                    echo 'Running Gitleaks to find hardcoded secrets...'
                    // Using --no-git to ignore the Git history of the deleted test/ folder
                    sh 'gitleaks detect --no-git --source="." -v || echo "Secrets found! (Proceeding for demo)"'
                }
            }
        }

        stage('2. IaC Scanning: Checkov') {
            steps {
                container('checkov') {
                    echo 'Scanning Kubernetes manifests with Checkov...'
                    // Scanning the deployment.yaml file for infrastructure misconfigurations
                    sh 'checkov -f deployment.yaml || echo "Misconfigurations found! (Proceeding for demo)"'
                }
            }
        }

        stage('3. Container Scanning: Trivy') {
            steps {
                container('trivy') {
                    echo 'Scanning the public image with Trivy...'
                    // Trivy will automatically pull the image from Docker Hub and scan it
                    sh 'trivy image ${REGISTRY_IMAGE}:${IMAGE_TAG} || echo "Vulnerabilities found! (Proceeding for demo)"'
                }
            }
        }

        stage('4. Deploy to EKS (Staging Environment)') {
            steps {
                container('kubectl') {
                    echo 'Deploying the application to EKS...'
                    // Create a deployment dynamically
                    sh 'kubectl create deployment juice-shop-demo --image=${REGISTRY_IMAGE}:${IMAGE_TAG} || true'
                    // Expose it as an internal ClusterIP service
                    sh 'kubectl expose deployment juice-shop-demo --port=3000 --name=juice-shop-service || true'
                    // Wait for the pod to be fully ready before starting the ZAP scan
                    sh 'kubectl wait --for=condition=available --timeout=60s deployment/juice-shop-demo'
                }
            }
        }

        stage('5. DAST: OWASP ZAP') {
            steps {
                container('zap') {
                    echo 'Running OWASP ZAP dynamic scanning against the EKS internal service...'
                    // Run Baseline Scan against the internal Kubernetes service URL and generate an HTML report
                    sh 'zap-baseline.py -t ${APP_URL} -r zap-report.html || echo "Vulnerabilities found in the running application!"'
                }
            }
        }
    }

    post {
        always {
            echo 'Cleaning up the EKS environment after the demo...'
            container('kubectl') {
                // Delete the deployment and service to keep the cluster clean for the next run
                sh 'kubectl delete deployment juice-shop-demo --ignore-not-found=true'
                sh 'kubectl delete service juice-shop-service --ignore-not-found=true'
            }
            // Save the ZAP HTML report as a Jenkins artifact so students can download it
            archiveArtifacts artifacts: 'zap-report.html', allowEmptyArchive: true
        }
    }
}