pipeline {
	agent any

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
					// CI=false: 경고를 에러로 처리하지 않음 (빌드 중단 방지)
					sh 'CI=false npm run build'
				}
			}
		}

		stage('Docker Build & Push') {
			when { branch 'main' }
			steps {
				script {
					def newTag = "${env.APP_VERSION_PREFIX}.${env.BUILD_ID}"
					echo "Building Docker Image: ${IMAGE_NAME}:${newTag}"

					docker.withRegistry('', "${DOCKER_CREDENTIAL_ID}") {
						def customImage = docker.build("${IMAGE_NAME}:${newTag}")
						customImage.push()
						customImage.push('latest')
					}
				}
			}
		}

	    stage('Update Manifest') {
            when {
                branch 'main'
            }
            steps {
                script {
                    // SSH 주소 형식으로 변경
                    def manifestRepoUrl = "git@github.com:beyond-team3/final-manifests.git"
                    def targetFile = "frontend/deployment.yml"
                    def imageName = "21monsoon/monsoon-frontend"
                    def newTag = "${env.APP_VERSION_PREFIX}.${env.BUILD_ID}"

                    // 등록하신 SSH 자격 증명 ID 사용
                    sshagent(credentials: ['github-deploy-key']) {
                        sh """
                            # 기존 임시 폴더 정리
                            rm -rf temp-manifests

                            # SSH를 통한 보안 클론
                            git clone ${manifestRepoUrl} temp-manifests
                            cd temp-manifests

                            # 젠킨스 봇 계정 설정
                            git config user.email "jenkins-bot@monsoon.com"
                            git config user.name "Jenkins-CI-Bot"

                            # 태그 업데이트
                            sed -i "s|image: ${imageName}:.*|image: ${imageName}:${newTag}|g" ${targetFile}

                            # 변경 사항이 있을 때만 커밋 및 푸시
                            git add ${targetFile}

                            if git diff --cached --quiet; then
                                echo "No changes detected in manifest; skipping commit/push."
                            else
                                # 동시 푸시 충돌 방지를 위한 rebase 전략 적용
                                git commit -m "[CD] Update ${imageName} to ${newTag} [skip ci]"
                                for attempt in 1 2 3; do
                                    git pull --rebase origin main && git push origin main && break
                                    if [ "$attempt" -eq 3 ]; then
                                        echo "Push failed after 3 attempts."
                                        exit 1
                                    fi
                                    sleep 2
                                done
                                git push origin main
                                echo "Manifest update stage completed for beyond-team3/final-manifests frontend"
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
			discordSend (webhookURL: "${env.DISCORD_WEBHOOK}",
				title: "🟢 [Frontend] 빌드 성공",
				description: "Branch: ${env.BRANCH_NAME}\nBuild: #${env.BUILD_ID}",
				result: 'SUCCESS')
		}
		failure {
			discordSend (webhookURL: "${env.DISCORD_WEBHOOK}",
				title: "🔴 [Frontend] 빌드 실패",
				description: "Branch: ${env.BRANCH_NAME}\nBuild: #${env.BUILD_ID}",
				result: 'FAILURE')
		}
	}
}