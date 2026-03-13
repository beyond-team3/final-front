pipeline {
	agent {
		kubernetes {
			yaml """
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: jnlp
    image: jenkins/inbound-agent:3355.v388858a_47b_33-6-jdk21
  - name: docker-cli
    image: docker:27-cli
    command: ['cat']
    tty: true
    volumeMounts:
    - name: docker-sock
      mountPath: /var/run/docker.sock
  - name: argocd-cli
    image: argoproj/argocd:v2.10.1
    command: ['cat']
    tty: true
  volumes:
  - name: docker-sock
    hostPath:
      path: /var/run/docker.sock
"""
		}
	}

	tools {
		nodejs 'node-24'
	}

	environment {
		DOCKER_CREDENTIAL_ID = 'docker-hub-id'
		ARGOCD_CREDENTIAL_ID = 'argocd-admin-login'
		DISCORD_WEBHOOK = credentials('discord-webhook-url')
		IMAGE_NAME = '21monsoon/monsoon-frontend'
		APP_VERSION_PREFIX = '0.0'
		FINAL_TAG = ""
	}

	stages {
		stage('Prepare Tag') {
			steps {
				script {
					env.FINAL_TAG = "${env.APP_VERSION_PREFIX}.${env.BRANCH_NAME.replaceAll("/", "-")}.${env.BUILD_NUMBER}.${env.GIT_COMMIT.take(7)}"
				}
			}
		}

		stage('Checkout') {
			steps {
				checkout scm
			}
		}

		stage('Install & Build') {
			steps {
				script {
					echo 'Installing Dependencies...'
					sh 'npm install'

					echo 'Building Project...'
					sh 'CI=false npm run build'
				}
			}
		}

		stage('Docker Build & Push') {
			steps {
				container('docker-cli') {
					script {
						withCredentials([usernamePassword(credentialsId: env.DOCKER_CREDENTIAL_ID,
							usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {

							echo "Building and Pushing Tag: ${env.FINAL_TAG}"

							// 도커 빌드 및 푸시
							sh "docker build --no-cache -t ${IMAGE_NAME}:${env.FINAL_TAG} ."
							sh "echo ${DOCKER_PASS} | docker login -u ${DOCKER_USER} --password-stdin"
							sh "docker push ${IMAGE_NAME}:${env.FINAL_TAG}"

							// main 브랜치일 경우에만 latest 태그 푸시
							if (env.BRANCH_NAME == 'main') {
								sh "docker tag ${IMAGE_NAME}:${env.FINAL_TAG} ${IMAGE_NAME}:latest"
								sh "docker push ${IMAGE_NAME}:latest"
							}
							sh "docker logout"
						}
					}
				}
			}
		}

		stage('Update Manifest') {
			when {
				anyOf {
					branch 'main'
					branch 'dev'
				}
			}
			steps {
				sshagent(credentials: ['github-deploy-key']) {
					script {
						def targetBranch = (env.BRANCH_NAME == 'main') ? 'main' : 'dev'

						echo "Targeting Tag: " + env.FINAL_TAG

						sh """
                            mkdir -p ~/.ssh
                            ssh-keyscan -t rsa github.com >> ~/.ssh/known_hosts

                            echo "Starting Manifest Update..."

                            git clone git@github.com:beyond-team3/final-manifests.git temp-manifests
                            cd temp-manifests
                            git checkout ${targetBranch}
                            sed -i "s|image: ${IMAGE_NAME}:.*|image: ${IMAGE_NAME}:${env.FINAL_TAG}|g" frontend/deployment.yml

                            git config user.email "jenkins-bot@monsoon.com"
                            git config user.name "Jenkins-CI-Bot"
                            git add frontend/deployment.yml
                            if ! git diff --cached --quiet; then
                                git commit -m "[CD] Update frontend to ${env.FINAL_TAG} [skip ci]"
                                git push origin ${targetBranch}
                            fi
                        """
					}
				}
			}
			post {
				always {
					sh 'rm -rf temp-manifests'
				}
			}
		}

		stage('Wait for Deploy') {
			steps {
				container('argocd-cli') {
					script {
						withCredentials([usernamePassword(credentialsId: env.ARGOCD_CREDENTIAL_ID,
							usernameVariable: 'ARGO_USER', passwordVariable: 'ARGO_PASS')]) {

							sh "argocd login argocd-server.argocd.svc.cluster.local --username ${ARGO_USER} --password ${ARGO_PASS} --insecure"
							sh "argocd app wait monsoon-app --timeout 300"

						}
						discordSend(
							webhookURL: env.DISCORD_WEBHOOK,
							title: "[Frontend] 배포 완료!",
							description: "도메인: https://www.monsoonseed.com\n버전: ${env.FINAL_TAG}",
							result: 'SUCCESS',
							color: '#00FF00'
						)
					}
				}
			}
		}
	}

	post {
		failure {
			discordSend (webhookURL: env.DISCORD_WEBHOOK,
				title: "🔴 [Frontend] 빌드 실패",
				description: "Branch: ${env.BRANCH_NAME}\nBuild: #${env.BUILD_ID}",
				result: 'FAILURE')
		}
	}
}