pipeline {
    agent {
        kubernetes {
            yaml '''
apiVersion: v1
kind: Pod
spec:
  # Using the default service account that Jenkins uses. 
  # Ensure this SA has RBAC permissions to create Deployments/Services in the namespace!
  containers:
  - name: jnlp
    image: jenkins/inbound-agent:latest-jdk11
  - name: gitleaks
    image: zricethezav/gitleaks:latest
    command: ["cat"]
    tty: true
  - name: checkov
    image: bridgecrew/checkov:latest
    command: ["cat"]
    tty: true
  - name: kaniko
    image: gcr.io/kaniko-project/executor:debug
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
    image: owasp/zap2docker-stable:latest
    command: ["cat"]
    tty: true
    user: root # ZAP needs root to write reports in the workspace
'''
        }
    }

    environment {
        // TODO: Replace with your actual Docker Hub or AWS ECR repository
        REGISTRY_IMAGE = "your-dockerhub-username/juice-shop-vulnerable"
        IMAGE_TAG = "${BUILD_NUMBER}"
        
        // The internal DNS name of the Kubernetes service we will create
        APP_URL = "http://juice-shop-service:3000" 
    }

    stages {
        stage('1. Secret Scanning: Gitleaks') {
            steps {
                container('gitleaks') {
                    echo 'Running Gitleaks to find hardcoded secrets...'
                    sh 'gitleaks detect --source="." -v || echo "Secrets found! (Proceeding for demo)"'
                }
            }
        }

        stage('2. IaC Scanning: Checkov') {
            steps {
                container('checkov') {
                    echo 'Scanning Kubernetes manifests with Checkov...'
                    sh 'checkov -f deployment.yaml || echo "Misconfigurations found! (Proceeding for demo)"'
                }
            }
        }

        stage('3. Build & Push Image: Kaniko') {
            steps {
                container('kaniko') {
                    echo 'Building and pushing image using Kaniko (daemonless)...'
                    // Note: To push to a real registry, you need to mount registry credentials (e.g., config.json)
                    // For demo purposes, if you don't have a registry, you can remove this stage and use bkimminich/juice-shop directly in the deploy stage.
                    sh '''
                        /kaniko/executor \
                        --context `pwd` \
                        --dockerfile Dockerfile \
                        --destination ${REGISTRY_IMAGE}:${IMAGE_TAG} \
                        --force
                    '''
                }
            }
        }

        stage('4. Container Scanning: Trivy') {
            steps {
                container('trivy') {
                    echo 'Scanning the pushed image with Trivy...'
                    sh 'trivy image ${REGISTRY_IMAGE}:${IMAGE_TAG} || echo "Vulnerabilities found! (Proceeding for demo)"'
                }
            }
        }

        stage('5. Deploy to EKS (Staging Environment)') {
            steps {
                container('kubectl') {
                    echo 'Deploying the application to EKS...'
                    // Create a deployment dynamically
                    sh 'kubectl create deployment juice-shop-demo --image=${REGISTRY_IMAGE}:${IMAGE_TAG} || true'
                    // Expose it as an internal ClusterIP service
                    sh 'kubectl expose deployment juice-shop-demo --port=3000 --name=juice-shop-service || true'
                    // Wait for the pod to be ready
                    sh 'kubectl wait --for=condition=available --timeout=60s deployment/juice-shop-demo'
                }
            }
        }

        stage('6. DAST: OWASP ZAP') {
            steps {
                container('zap') {
                    echo 'Running OWASP ZAP dynamic scanning against the EKS internal service...'
                    // Run Baseline Scan against the internal Kubernetes service URL
                    sh 'zap-baseline.py -t ${APP_URL} -r zap-report.html || echo "Vulnerabilities found in the running application!"'
                }
            }
        }
    }

    post {
        always {
            echo 'Cleaning up the EKS environment after the demo...'
            container('kubectl') {
                // Delete the deployment and service so the next pipeline run starts fresh
                sh 'kubectl delete deployment juice-shop-demo --ignore-not-found=true'
                sh 'kubectl delete service juice-shop-service --ignore-not-found=true'
            }
            // Archive the ZAP report so students can download and review it
            archiveArtifacts artifacts: 'zap-report.html', allowEmptyArchive: true
        }
    }
}