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
		AWS_CREDENTIAL_ID = 'aws-ecr-credentials'
		AWS_REGION = 'ap-northeast-2'
		ECR_REGISTRY = '906034468269.dkr.ecr.ap-northeast-2.amazonaws.com'
		IMAGE_NAME = "${ECR_REGISTRY}/monsoon-frontend"

		ARGOCD_CREDENTIAL_ID = 'argocd-admin-login'
		DISCORD_WEBHOOK = credentials('discord-webhook-url')
		FINAL_TAG = ""
	}

	stages {
		stage('Checkout') {
			steps {
				checkout scm
			}
		}

		stage('Prepare Tag') {
			steps {
				script {
					def gitCommit = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim() // 깃허브 커밋 해시 앞 7자리

					env.FINAL_TAG = "${gitCommit}"
					echo "완벽하게 생성된 태그: ${env.FINAL_TAG}"
				}
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

		stage('Docker Build & Push to ECR') {
			steps {
				container('docker-cli') {
					script {
						withCredentials([usernamePassword(credentialsId: env.AWS_CREDENTIAL_ID,
							usernameVariable: 'AWS_ACCESS_KEY_ID', passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {

							echo "1. Installing AWS CLI..."
							sh "apk add --no-cache aws-cli"

							echo "2. Building Tag: ${env.FINAL_TAG}"
							sh "docker build --no-cache -t ${IMAGE_NAME}:${env.FINAL_TAG} ."

							echo "3. Logging into AWS ECR..."
							sh "aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}"

							echo "4. Pushing Image to ECR..."
							sh "docker push ${IMAGE_NAME}:${env.FINAL_TAG}"

							// main 브랜치일 경우에만 latest 태그 푸시
							if (env.BRANCH_NAME == 'main') {
								sh "docker tag ${IMAGE_NAME}:${env.FINAL_TAG} ${IMAGE_NAME}:latest"
								sh "docker push ${IMAGE_NAME}:latest"
							}

							// 로그아웃
							sh "docker logout ${ECR_REGISTRY}"
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

                            sed -i "s|image: .*monsoon-frontend:.*|image: ${IMAGE_NAME}:${env.FINAL_TAG}|g" frontend/deployment.yml

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

		stage('Notify Deployment') {
			steps {
				script {
					if (env.BRANCH_NAME == 'main') {
						discordSend(
							webhookURL: env.DISCORD_WEBHOOK,
							title: "🚀 [Frontend] Preview 배포 준비 완료 (main)",
							description: """새 버전(${env.FINAL_TAG}) 매니페스트가 성공적으로 업데이트되었습니다.
ArgoCD 동기화가 완료되면 아래 링크에서 새 API를 테스트해 주세요!

👀 **미리보기(Preview) 도메인 (프론트/백엔드 연동):**
https://preview.monsoonseed.com

✅ **테스트 완료 후 실제 운영 배포 방법:**
ArgoCD 대시보드에서 'monsoon-frontend' Rollout의 **[Promote]** 버튼을 누르거나,
터미널에서 'kubectl argo rollouts promote monsoon-frontend -n monsoon-dev' 를 실행해 주세요. (무중단 전환)""",
							result: 'SUCCESS'
						)
					}
					else {
						discordSend(
							webhookURL: env.DISCORD_WEBHOOK,
							title: "🟢 [Frontend] 빌드 성공 (${env.BRANCH_NAME})",
							description: "Branch: ${env.BRANCH_NAME}\n새로운 버전(${env.FINAL_TAG})의 도커 이미지가 ECR에 성공적으로 푸시되었습니다.",
							result: 'SUCCESS'
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