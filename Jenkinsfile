pipeline {
	// 백엔드와 동일하게 docker-cli를 사용할 수 있는 Kubernetes Agent 설정 적용
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
    - name: ssh-config
      mountPath: /home/jenkins/.ssh/known_hosts
      subPath: known_hosts
  volumes:
  - name: docker-sock
    hostPath:
      path: /var/run/docker.sock
  - name: ssh-config
    configMap:
      name: ssh-known-hosts
"""
		}
	}

	tools {
		nodejs 'node-24'
	}

	environment {
		DOCKER_CREDENTIAL_ID = 'docker-hub-id'
		DISCORD_WEBHOOK = credentials('discord-webhook-url')
		IMAGE_NAME = '21monsoon/monsoon-frontend'
		APP_VERSION_PREFIX = '0.0'
	}

	stages {
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
						def prefix = env.APP_VERSION_PREFIX
						def cleanBranchName = env.BRANCH_NAME.replaceAll("/", "-")
						def buildNum = env.BUILD_NUMBER
						def shortSha = env.GIT_COMMIT.take(7)

						def newTag = "${prefix}.${cleanBranchName}.${buildNum}.${shortSha}"

						withCredentials([usernamePassword(credentialsId: env.DOCKER_CREDENTIAL_ID,
							usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {

							echo "Building and Pushing Tag: ${newTag}"

							// 도커 빌드 및 푸시
							sh "docker build --no-cache -t ${IMAGE_NAME}:${newTag} ."
							sh "echo ${DOCKER_PASS} | docker login -u ${DOCKER_USER} --password-stdin"
							sh "docker push ${IMAGE_NAME}:${newTag}"

							// main 브랜치일 경우에만 latest 태그 푸시
							if (env.BRANCH_NAME == 'main') {
								sh "docker tag ${IMAGE_NAME}:${newTag} ${IMAGE_NAME}:latest"
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
				script {
					def manifestRepoUrl = "git@github.com:beyond-team3/final-manifests.git"
					def targetFile = "frontend/deployment.yml"
					def imageName = "21monsoon/monsoon-frontend"

					def prefix = env.APP_VERSION_PREFIX
					def cleanBranchName = env.BRANCH_NAME.replaceAll("/", "-")
					def buildNum = env.BUILD_NUMBER
					def shortSha = env.GIT_COMMIT.take(7)
					def newTag = "${prefix}.${cleanBranchName}.${buildNum}.${shortSha}"

					// 현재 브랜치에 따라 대상 브랜치 결정
					def targetBranch = (env.BRANCH_NAME == 'main') ? 'main' : 'dev'

					sshagent(credentials: ['github-deploy-key']) {
						sh """
                            mkdir -p ~/.ssh
                            ssh-keyscan -t rsa github.com >> ~/.ssh/known_hosts

                            rm -rf temp-manifests
                            git clone ${manifestRepoUrl} temp-manifests
                            cd temp-manifests

                            # 타겟 브랜치로 체크아웃
                            git checkout ${targetBranch} || git checkout -b ${targetBranch}

                            git config user.email "jenkins-bot@monsoon.com"
                            git config user.name "Jenkins-CI-Bot"

                            sed -i "s|image: ${imageName}:.*|image: ${imageName}:${newTag}|g" ${targetFile}

                            git add ${targetFile}

                            if git diff --cached --quiet; then
                                echo "No changes detected in manifest; skipping commit/push."
                            else
                                git commit -m "🚀 [CD] Update ${imageName} to ${newTag} [skip ci]"
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
	}

	post {
		success {
			discordSend (webhookURL: env.DISCORD_WEBHOOK,
				title: "🟢 [Frontend] 빌드 성공",
				description: "Branch: ${env.BRANCH_NAME}\nBuild: #${env.BUILD_ID}",
				result: 'SUCCESS')
		}
		failure {
			discordSend (webhookURL: env.DISCORD_WEBHOOK,
				title: "🔴 [Frontend] 빌드 실패",
				description: "Branch: ${env.BRANCH_NAME}\nBuild: #${env.BUILD_ID}",
				result: 'FAILURE')
		}
	}
}