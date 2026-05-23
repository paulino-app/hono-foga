import chalk from 'chalk'

export interface WelcomeOptions {
  mode: string
  port: number | string
  poweredByVersion?: string
}

/**
 * Prints the boot banner for a hono-foga app. Caller passes mode and port
 * so the package stays free of env reads.
 */
export default function welcomeMessage(options: WelcomeOptions) {
  const { mode, port, poweredByVersion } = options

  const ascii = `
              __
   ________  / /_  __  ______ ___  ______ _
  / ___/ _ \\/ __ \\/ / / / __ '/ / / / __ '/
 (__  )  __/ / / / /_/ / /_/ / /_/ / /_/ /
/____/\\___/_/ /_/\\____/\\____/\\__  /\\____/
                            /____/
${chalk.magenta(
  poweredByVersion
    ? `Powered by Hono Foga ${poweredByVersion}`
    : 'Powered by Hono Foga'
)}
  `

  const modeLabel =
    mode === 'development' ? chalk.blue('Desarrollo') : chalk.green('Producción')
  const portLabel = chalk.magenta(String(port))
  const message = `Servidor iniciado en modo ${modeLabel} en el puerto ${portLabel}`

  console.log(chalk.blue(ascii))
  console.log(`${chalk.magenta('• ')}${message}\n`)
}
