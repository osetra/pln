import { exec } from 'child_process'

const PROMPT = 'What most interesting and fun in this. And what need to be first?'
//getAnswer().then((answer) => {
//    console.log(answer)
//})

/**
 * @param {string} prompt 
 * @returns {string}
 */
export default async function getAnswer(prompt) {
    // Оборачиваем exec в Promise для использования с async/await
    const answer = await new Promise((resolve, reject) => {

        exec(`cat <<'EOF' | /usr/local/bin/tgpt
        ${prompt || PROMPT}
        EOF`, (error, stdout, stderr) => {
                if (error) return reject(error)
                if (stderr) console.error(stderr)
                resolve(stdout)
        })
        //exec(`echo '${prompt || PROMPT}' | /usr/local/bin/tgpt`, (error, stdout, stderr) => {
        //    if (error) {
        //        reject(error);
        //        return;
        //    }
        //    if (stderr) {
        //        console.error('stderr:', stderr)
        //    }
        //    resolve(stdout)
        //})
    })
    
    //console.log('Result:', answer.trim())
    return answer.trim()
}
