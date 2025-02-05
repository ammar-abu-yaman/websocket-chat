import { ReactNode } from 'react'
import styles from './MainContainer.module.scss'

export default function MainContainer({ children }: { children: ReactNode }) {
    return (
        <main className={`${styles['main-container']}`}>
            <div className={styles['content-container']}>{children}</div>
        </main>
    )
}
