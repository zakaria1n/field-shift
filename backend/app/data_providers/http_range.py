"""Small, bounded HTTP byte-range reader for Rasterio's Python opener.

Uses httpx rather than GDAL's platform-specific TLS stack. Rejects a server
ignoring Range, so a regional read cannot download a whole global/tile raster.
"""
import io
import re
from collections import OrderedDict

import httpx


class RangeReader(io.RawIOBase):
    BLOCK = 65536
    MAX_REQUESTS = 96  # <= 6 MiB per raster handle

    def __init__(self, url: str, timeout: int = 15):
        super().__init__()
        self.url = url
        # Preserve deployment proxy/TLS environment; a custom transport would
        # silently bypass HTTP(S)_PROXY on managed Windows installations.
        self.client = httpx.Client(timeout=timeout, follow_redirects=True)
        self.position = 0
        self.length = None
        self.blocks = OrderedDict()
        self.requests = 0
        self._block(0)

    def _block(self, index):
        if index in self.blocks:
            return self.blocks[index]
        if self.requests >= self.MAX_REQUESTS:
            raise OSError("Bounded raster byte budget exceeded")
        start = index * self.BLOCK
        if self.length is not None and start >= self.length:
            return b""
        end = start + self.BLOCK - 1
        self.requests += 1
        # A distinct query key also prevents intermediary caches from mixing ranges.
        url = self.url + ("&" if "?" in self.url else "?") + f"fsrange={start}"
        with self.client.stream("GET", url, headers={"Range": f"bytes={start}-{end}", "Accept-Encoding": "identity"}) as response:
            response.raise_for_status()
            match = re.fullmatch(r"bytes (\d+)-(\d+)/(\d+)", response.headers.get("content-range", ""))
            if response.status_code != 206 or not match or int(match[1]) != start:
                raise OSError("Raster server did not honor the requested byte range")
            self.length = int(match[3])
            chunks = []
            size = 0
            for chunk in response.iter_bytes():
                size += len(chunk)
                if size > self.BLOCK:
                    raise OSError("Raster range response exceeds the bounded request")
                chunks.append(chunk)
            data = b"".join(chunks)
        self.blocks[index] = data
        return data

    def read(self, size=-1):
        if size < 0:
            size = self.length - self.position
        size = min(size, self.length - self.position)
        chunks = []
        while size > 0:
            index, offset = divmod(self.position, self.BLOCK)
            block = self._block(index)
            piece = block[offset:offset+size]
            if not piece:
                break
            chunks.append(piece)
            size -= len(piece)
            self.position += len(piece)
        return b"".join(chunks)

    def seek(self, offset, whence=0):
        self.position = offset if whence == 0 else self.position + offset if whence == 1 else self.length + offset
        if self.position < 0:
            raise ValueError("Negative seek")
        return self.position

    def tell(self):
        return self.position

    def readable(self):
        return True

    def seekable(self):
        return True

    def close(self):
        self.client.close()
        super().close()
