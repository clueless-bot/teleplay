pipeline {
    agent any

    tools {
        nodejs "NodeJS 20" // Jenkins Global Tool
    }

    environment {
        BACKEND_ENV = credentials('backend-env')
        FRONTEND_ENV = credentials('frontend_env')
        NODE_ENV = 'production'
    }

    stages {

        stage('Checkout') {
            steps {
                git(
                    url: 'https://github.com/clueless-bot/teleplay.git',
                    branch: 'master',
                    credentialsId: 'github-teleplay'
                )
            }
        }

        stage('Install pnpm and pm2') {
            steps {
                sh '''
                    # Enable corepack & pnpm
                    if ! command -v corepack >/dev/null 2>&1; then
                          echo "pnpm not found, installing..."
                          npm install -g pnpm
                    else
                           echo "pnpm already installed"
                        
                    fi
                    pnpm --version

                    # Install pm2 globally if missing
                    if ! command -v pm2 >/dev/null 2>&1; then
                        npm install -g pm2
                    fi
                    pm2 -v
                '''
            }
        }




        





        stage('Debug Backend Build') {
            steps {
                dir('src/src') {
                    sh '''
                        echo "Current directory: $(pwd)"
                        ls -la
                    '''
                }
            }
        }



        
        stage('Write Env Files') {
            steps {
                dir('src') {
                    sh 'echo "$BACKEND_ENV" > .env'
                }
                dir('teleplay') {
                    sh 'echo "$FRONTEND_ENV" > .env'
                }     
            }
        }

        stage('Install Backend Dependencies') {
            environment {
                CI = 'false'
            }
            steps {
                dir('src') {
                    sh 'pnpm install'
                }
            }
        }

        stage('Start/Restart Backend') {
            steps {
                dir('src/src') { // <-- Correct folder containing server.js
                    sh '''
                pm2 stop node-src || true
                pm2 delete node-src || true
                pm2 start server.js --name node-src --update-env
            '''
                }
            }
        }

        stage('Install Frontend Dependencies') {
            steps {
                dir('teleplay') {
                   sh '''
                        echo "Installing frontend dependencies..."
                        rm -rf node_modules .vite .vite-temp
                        npm install --include=dev
                    '''
                }
            }
        }

        stage('Build Frontend') {
    steps {
        dir('teleplay') {
            sh '''
                echo "Current dir: $(pwd)"

                BUILD_DIR="$(pwd)/dist"
                DEPLOY_DIR="/var/www/react-app"

                # Clear old files inside deploy dir (without removing folder)
                find "$DEPLOY_DIR" -mindepth 1 -delete

                # Build frontend
                npm run build

                # Copy build to deployment folder
                if [ -d "$BUILD_DIR" ]; then
                    cp -r "$BUILD_DIR"/* "$DEPLOY_DIR"/
                else
                    echo "❌ Build folder '$BUILD_DIR' not found!"
                    exit 1
                fi
            '''
        }
    }
}
}


    

    post {
        success {
            echo '✅ Deployment successful with pnpm!'
        }
        failure {
            echo '❌ Deployment failed!'
        }
    }
}
