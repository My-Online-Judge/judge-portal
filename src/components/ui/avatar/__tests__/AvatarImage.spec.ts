// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { Avatar, AvatarFallback, AvatarImage } from '..'

const SRC = 'https://lh3.googleusercontent.com/a/photo'

// Every Image the page creates (the preload), with the referrer policy it had when its src was set.
const created: { img: HTMLImageElement; policyAtSrc: string | null }[] = []
const RealImage = window.Image

function spyOnImage() {
    vi.spyOn(window, 'Image').mockImplementation(function (this: unknown) {
        const img = new RealImage()
        const entry = { img, policyAtSrc: null as string | null }
        const desc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src')!
        Object.defineProperty(img, 'src', {
            get: () => desc.get!.call(img),
            set: (v: string) => {
                entry.policyAtSrc = img.referrerPolicy
                desc.set!.call(img, v)
            },
        })
        created.push(entry)
        return img
    } as unknown as typeof Image)
}

const mounted: VueWrapper[] = []
async function mountAvatar() {
    const w = mount(
        defineComponent({
            setup: () => () =>
                h(Avatar, null, () => [h(AvatarImage, { src: SRC, alt: 'Alice' }), h(AvatarFallback, null, () => 'AT')]),
        }),
        { attachTo: document.body },
    )
    mounted.push(w)
    await flushPromises()
    return w
}

afterEach(() => {
    mounted.splice(0).forEach((w) => w.unmount())
    created.length = 0
    vi.restoreAllMocks()
})

describe('AvatarImage', () => {
    it('theImageSendsNoReferrer', async () => {
        spyOnImage()
        const w = await mountAvatar()
        expect(created.length).toBeGreaterThan(0)
        created.forEach(({ img }) => img.dispatchEvent(new Event('load')))
        await flushPromises()

        const img = w.get('img')
        expect(img.attributes('src')).toBe(SRC)
        expect(img.attributes('referrerpolicy')).toBe('no-referrer')
        // Loaded: the image shows and the initials step aside.
        expect(w.text()).not.toContain('AT')
    })

    it('thePreloadSendsNoReferrer', async () => {
        spyOnImage()
        await mountAvatar()
        const preloads = created.filter(({ img }) => img.getAttribute('src') === SRC)
        expect(preloads.length).toBeGreaterThan(0)
        for (const { img, policyAtSrc } of preloads) {
            expect(img.referrerPolicy).toBe('no-referrer')
            // Set before the src, so the very first request already carries it.
            expect(policyAtSrc).toBe('no-referrer')
        }
    })

    it('aBrokenImageFallsBackToTheInitials', async () => {
        spyOnImage()
        const w = await mountAvatar()
        created.forEach(({ img }) => img.dispatchEvent(new Event('error')))
        await flushPromises()
        expect(w.text()).toContain('AT')
        expect(w.get('img').isVisible()).toBe(false)
    })
})
