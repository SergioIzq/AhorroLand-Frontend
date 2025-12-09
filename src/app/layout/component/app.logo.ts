import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-logo',
    standalone: true,
    imports: [CommonModule],
    styles: [
        `
            :host {
                display: inline-block; /* O block, según prefieras */
                height: 25px; /* Altura por defecto si no le pones clase */
                width: auto;
            }

            svg {
                width: auto;
                height: 100%;
                transition: all 0.2s ease;
            }

            /* Asegurar que todos los paths usen el color primario */
            :host ::ng-deep svg path,
            :host ::ng-deep svg circle,
            :host ::ng-deep svg rect,
            :host ::ng-deep svg polygon,
            :host ::ng-deep svg ellipse {
                fill: var(--primary-color);
                transition: fill 0.2s ease;
            }

            /* Si hay strokes también */
            :host ::ng-deep svg path[stroke],
            :host ::ng-deep svg circle[stroke],
            :host ::ng-deep svg line {
                stroke: var(--primary-color);
                transition: stroke 0.2s ease;
            }
        `
    ],
    template: `
        <svg version="1.0" xmlns="http://www.w3.org/2000/svg" width="512.000000pt" height="512.000000pt" viewBox="0 0 512.000000 512.000000" preserveAspectRatio="xMidYMid meet">
            <g transform="translate(0.000000,512.000000) scale(0.100000,-0.100000)" fill="#000000" stroke="none">
                <path
                    d="M650 5105 c-337 -68 -587 -329 -639 -665 -9 -56 -11 -550 -9 -1925 3
                        -2021 -1 -1859 58 -2017 66 -177 261 -372 438 -438 157 -59 2 -55 2062 -55
                        1729 0 1890 1 1945 17 216 60 372 171 485 345 83 125 111 222 90 300 -36 128
                        -198 183 -307 104 -29 -21 -51 -52 -86 -123 -55 -112 -106 -164 -205 -211
                        l-67 -32 -1855 0 -1855 0 -67 32 c-93 44 -151 100 -196 191 l-37 76 -3 1223
                        c-1 673 1 1223 5 1223 5 0 24 -6 43 -12 27 -10 474 -14 2001 -18 l1965 -5 76
                        -37 c91 -45 147 -103 191 -196 l32 -67 3 -232 4 -233 -355 0 c-411 0 -465 -6
                        -594 -70 -168 -83 -278 -237 -311 -433 -14 -88 -14 -106 0 -194 33 -197 143
                        -351 311 -432 141 -69 174 -72 728 -69 l485 3 41 27 c22 15 51 44 64 65 l24
                        38 0 780 c0 845 2 805 -55 957 -29 77 -104 191 -175 261 -99 101 -212 166
                        -375 215 -50 15 -221 17 -2010 22 l-1955 5 -40 21 c-22 11 -53 40 -70 63 -26
                        37 -30 51 -30 111 0 60 4 74 30 111 17 23 48 52 70 63 l40 21 1815 5 c1754 5
                        1816 6 1853 24 134 66 140 267 10 347 l-38 24 -1810 3 c-1732 3 -1859 1 -1954
                        -25 l-24 -6 6 68 c13 141 95 258 225 323 l76 37 1856 0 1856 0 76 -37 c91 -45
                        147 -103 191 -196 l32 -67 5 -271 5 -271 27 -40 c41 -62 90 -88 168 -88 78 0
                        127 26 168 88 l27 41 0 285 c0 303 -2 323 -55 463 -29 77 -104 191 -175 261
                        -99 101 -212 166 -375 215 -50 16 -208 17 -1925 19 -1515 1 -1882 -1 -1935
                        -12z m4070 -3355 l0 -201 -362 3 c-346 3 -365 4 -403 24 -80 42 -120 140 -96
                        232 14 52 72 113 121 129 23 7 161 11 388 12 l352 1 0 -200z"
                />
            </g>
        </svg>
    `
})
export class AppLogo {}
