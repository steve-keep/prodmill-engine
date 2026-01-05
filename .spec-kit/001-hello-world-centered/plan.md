# Plan for 001-hello-world-centered

To center the text, we will use Tailwind CSS utility classes.

### Horizontal Centering
To center text horizontally, we can use the `text-center` class on a block-level element.

```html
<div class="text-center">
  <p>Hello, World!</p>
</div>
```

### Vertical and Horizontal Centering
For both vertical and horizontal centering, we can use flexbox utilities. We'll make the parent container a flex container, and then use `justify-center` and `items-center` to center the content. We also need to make sure the container has a height, for example `h-screen` to take the full height of the screen.

```html
<div class="flex items-center justify-center h-screen">
  <h1 class="text-3xl font-bold">Hello, World!</h1>
</div>
```

This will create a full-height container and center the "Hello, World!" text in the middle of the page.
