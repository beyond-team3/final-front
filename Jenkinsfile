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

	    stage('Update Manifest (CD)') {
            when { branch 'main' }
            steps {
                script {
                    // 1. 설정 변수
                    def manifestRepoUrl = "github.com/beyond-team3/monsoon-manifests.git"
                    def targetFile = "frontend/deployment.yml"
                    def imageName = "21monsoon/monsoon-frontend"
                    def newTag = "${env.APP_VERSION_PREFIX}.${env.BUILD_ID}"

                    withCredentials([usernamePassword(credentialsId: 'github-access-token', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_PASS')]) {
                        sh """
                            set +x
                            # 기존 폴더 정리
                            rm -rf temp-manifests

                            # Clone (이때는 비밀번호 사용)
                            git clone https://${GIT_USER}:${GIT_PASS}@${manifestRepoUrl} temp-manifests

                            cd temp-manifests

                            # 로컬 설정 파일(.git/config)에서 비밀번호가 포함된 URL을 즉시 삭제
                            git remote set-url origin https://${manifestRepoUrl}

                            # 젠킨스 봇 계정 설정
                            git config user.email "jenkins-bot@monsoon.com"
                            git config user.name "Jenkins-CI-Bot"

                            # 파일 수정 (sed)
                            sed -i "s|image: ${imageName}:.*|image: ${imageName}:${newTag}|g" ${targetFile}

                            # Commit & Push
                            git add "${targetFile}"
                            # Push 할 때만 일회성으로 비밀번호를 다시 조합해서 사용
                            git diff-index --quiet HEAD || (git commit -m "🚀 [CD] Update ${imageName} to ${newTag}" && git push https://${GIT_USER}:${GIT_PASS}@${manifestRepoUrl} main)

                            set -x
                        """
                    }
                }
            }
            // 빌드가 성공하든 실패하든 무조건 임시 폴더 삭제
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