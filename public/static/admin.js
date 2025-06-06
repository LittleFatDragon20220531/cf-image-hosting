var viewer = null;
const filterEmptyUrls = (array) => {
  return array.filter(item => item.url && item.url !== '');
}

// 添加带认证的请求函数
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('token');
    if (!token) {
        location.href = '/login';
        return;
    }

    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };

    const response = await fetch(url, { ...options, headers });
    
    if (response.status === 401) {
        localStorage.removeItem('token');
        location.href = '/login';
        return;
    }

    return response;
}

// 修改获取列表函数
const getList = async () => {
    const response = await fetchWithAuth('/list');
    const data = await response.json();
    
    const imageContainer = document.getElementById('image-container');
    const loadingContainer = document.getElementById('admin-loading');
    loadingContainer.style.display = 'none'
    imageContainer.innerHTML = '';
    
    let list = filterEmptyUrls(data.data)
    list.forEach(item => {
        const imageElement = document.createElement('div');
        imageElement.className = 'group cursor-pointer relative';
        imageElement.innerHTML = `
            <div class="group cursor-pointer relative">
                <img data-src="${item.url}" src="https://images.100769.xyz/file/JBcQSD" class="lazyload w-full h-80 object-cover rounded-lg transition-transform transform scale-100 group-hover:scale-105" />
                <div class="absolute inset-0 transition duration-200 bg-gray-900 opacity-0 rounded-2xl group-hover:opacity-60"></div>
                <div class="absolute inset-0 flex flex-col items-center justify-center transition duration-200 opacity-0 group-hover:opacity-100">
                    <div class="mb-2 shadow-sm w-33 rounded-2xl">
                        <a  data-url="${item.url}" class="c-view inline-flex w-full justify-center items-center px-6 py-2 rounded-2xl shadow-sm border border-transparent text-sm font-medium rounded-2xl text-cool-indigo-700 bg-white transition duration-150 hover:bg-cool-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cool-indigo-500">查看</a>
                    </div>
                    <div class="mb-2 shadow-sm w-33 rounded-2xl">
                        <a data-url="${item.url}" class="c-copy w-full justify-center inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-2xl shadow-sm text-white transition duration-150 bg-indigo-500 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cool-indigo-500">复制</a>
                    </div>
                    <div class="mb-2 shadow-sm w-33 rounded-2xl">
                        <label class="w-full justify-center inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-2xl shadow-sm text-white transition duration-150 bg-green-500 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cool-indigo-500 cursor-pointer">
                            重新上传
                            <input type="file" class="hidden" onchange="handleReupload(event, '${item.url}')" accept="image/*"/>
                        </label>
                    </div>
                    <div class="shadow-sm w-33 rounded-2xl">
                        <a data-key="${item.key}" class="c-del w-full justify-center inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-2xl shadow-sm text-white transition duration-150 bg-red-500 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cool-indigo-500">删除</a>
                    </div>
                </div>
            </div>
        `;
        imageContainer.appendChild(imageElement);
    });

    // 绑定事件监听器
    const copyButtons = document.querySelectorAll('.c-copy');
    const viewButtons = document.querySelectorAll('.c-view');
    const delButtons = document.querySelectorAll('.c-del');
    copyButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            const url = this.dataset.url;
            console.log(url);
            copyToClipboard(url);
        });
    });
    viewButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            const imageElement = this.closest('.group');
            const imageUrl = this.dataset.url;
            console.log(imageUrl);
            if (viewer) {
                viewer.hide();
                viewer.destroy();
            }
            viewer = new Viewer(imageElement.querySelector('img'), {});
            viewer.show();
        });
    });
    delButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            let key = this.dataset.key
            delItem(key)
        })
    })
};

// 修改删除函数
const delItem = async (key) => {
    const response = await fetchWithAuth(`/del/${key}`);
    const data = await response.json();
    if (data.code == 200) {
        getList();
    }
}

// 修改重新上传函数
async function handleReupload(event, originalUrl) {
    const file = event.target.files[0];
    if (!file) return;

    const key = originalUrl.split('/').pop();
    const formData = new FormData();
    formData.append('file', file);

    const adminLoading = document.getElementById('admin-loading');

    try {
        adminLoading.style.display = 'flex';

        const response = await fetchWithAuth(`/update/${key}`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            // 生成新的时间戳
            const timestamp = Date.now();
            const newUrl = `${originalUrl}?v=${timestamp}`;
            
            // 找到所有需要更新的图片元素
            const imgElements = document.querySelectorAll(`img[data-src="${originalUrl}"]`);
            
            // 直接更新图片源和 data-src
            imgElements.forEach(img => {
                img.src = newUrl;
                if(img.hasAttribute('data-src')) {
                    img.setAttribute('data-src', originalUrl); // 保持原始 URL 在 data-src
                    img.setAttribute('src', newUrl); // 更新显示的图片
                }
                
                // 强制浏览器重新加载图片
                img.style.opacity = '0.99';
                setTimeout(() => img.style.opacity = '1', 50);
            });

            showAlert('更新成功');
            
            // 更新查看按钮的 URL
            const viewButtons = document.querySelectorAll(`.c-view[data-url="${originalUrl}"]`);
            viewButtons.forEach(button => {
                button.setAttribute('data-url', originalUrl);
            });

            // 如果有查看器实例，更新它
            if (viewer) {
                viewer.update();
            }
        } else {
            showAlert(result.message || '更新失败', 'error');
        }
    } catch (error) {
        console.error('更新失败:', error);
        showAlert('更新失败', 'error');
    } finally {
        adminLoading.style.display = 'none';
        
        // 清除 input 的值，确保可以重复选择同一文件
        event.target.value = '';
    }
}

// 修改页面加载事件，添加登录检查
document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('token');
    if (!token) {
        location.href = '/login';
        return;
    }
    getList();
});

function copyToClipboard(text) {
    const tempInput = document.createElement('textarea');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    const calert = document.getElementById('calert')
    calert.innerText = '复制成功'
    calert.style.display = 'block';
    setTimeout(() => {
        calert.style.display = 'none';
    }, 3000)
}

// 添加提示框显示函数（如果还没有的话）
function showAlert(message, type = 'success') {
    const alert = document.getElementById('calert');
    alert.classList.remove('hidden');
    alert.querySelector('p').textContent = message;
    
    if (type === 'error') {
        alert.classList.remove('bg-green-100', 'border-green-500', 'text-green-700');
        alert.classList.add('bg-red-100', 'border-red-500', 'text-red-700');
    } else {
        alert.classList.remove('bg-red-100', 'border-red-500', 'text-red-700');
        alert.classList.add('bg-green-100', 'border-green-500', 'text-green-700');
    }

    setTimeout(() => {
        alert.classList.add('hidden');
    }, 3000);
}