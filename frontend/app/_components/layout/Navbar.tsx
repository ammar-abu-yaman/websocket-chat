import styles from './Navbar.module.scss'
import React from 'react'

export default function Navbar() {
    return (
        <div className={styles['top-navbar']}>
            <h4>URL Shortener</h4>
        </div>
    )
}
